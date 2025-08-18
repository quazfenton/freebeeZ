import { BrowserProfile } from './index'
import { ProxyConfig } from '../types'
import winston from 'winston';
import { Browser, Page } from 'puppeteer-core';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
  ],
});

export interface BrowserbaseConfig {
  apiKey: string;
  projectId: string;
  baseUrl?: string;
  endpoint?: string;
  defaultTimeout?: number;
  maxConcurrentSessions?: number;
  enableRecording?: boolean;
  enableDebugging?: boolean
}

export interface BrowserProfile {
  id: string;
  name: string;
  userAgent: string;
  viewport: { width: number; height: number };
  locale: string;
  timezone: string;
  cookies?: any[];
  localStorage?: Record<string, string>;
  sessionStorage?: Record<string, string>;
}

export interface BrowserbaseSession {
  id: string;
  status: 'starting' | 'running' | 'completed' | 'failed' | 'timeout';
  browserWSEndpoint?: string;
  debuggerUrl?: string;
  recordingUrl?: string;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  duration?: number;
  error?: string;
  metadata: {
    profile?: BrowserProfile;
    proxy?: ProxyConfig;
    region?: string;
    browserVersion?: string;
    userAgent?: string;
  }
}

export interface BrowserbaseSessionOptions {
  profile?: BrowserProfile;
  proxy?: ProxyConfig;
  region?: 'us-east-1' | 'us-west-2' | 'eu-west-1' | 'ap-southeast-1';
  browserVersion?: string;
  timeout?: number;
  enableRecording?: boolean;
  enableDebugging?: boolean;
  viewport?: { width: number; height: number };
  userAgent?: string;
  extraHeaders?: Record<string, string>;
  geolocation?: { latitude: number; longitude: number };
  timezone?: string;
  locale?: string;
}

export interface BrowserbaseUsage {
  sessionsUsed: number;
  sessionsLimit: number;
  minutesUsed: number;
  minutesLimit: number;
  storageUsed: number;
  storageLimit: number;
  bandwidthUsed: number;
  bandwidthLimit: number;
  resetDate: Date;
}

export interface BrowserbaseMetrics {
  averageSessionDuration: number;
  successRate: number;
  errorRate: number;
  mostUsedRegions: string[];
  peakUsageHours: number[];
  totalSessions: number;
  totalMinutes: number;
}

export class BrowserbaseAdapter {
  private config: BrowserbaseConfig;
  private activeSessions: Map<string, BrowserbaseSession> = new Map();
  private sessionQueue: Array<{ options: BrowserbaseSessionOptions; resolve: Function; reject: Function }> = [];
  private isProcessingQueue = false;
  private usage?: BrowserbaseUsage;
  private metrics: BrowserbaseMetrics = {
    averageSessionDuration: 0,
    successRate: 0,
    errorRate: 0,
    mostUsedRegions: [],
    peakUsageHours: [],
    totalSessions: 0,
    totalMinutes: 0
  };

  constructor(config: BrowserbaseConfig) {
    this.config = {
      endpoint: 'https://api.browserbase.com',
      defaultTimeout: 300000, // 5 minutes
      maxConcurrentSessions: 5,
      enableRecording: false,
      enableDebugging: false,
      baseUrl: config.baseUrl || 'https://www.browserbase.com/api/v1',
      ...config
    }
    
    this.startQueueProcessor();
    this.startUsageMonitoring();
    logger.info('BrowserbaseAdapter initialized.');
  }

  async createSession(options: BrowserbaseSessionOptions = {}): Promise<BrowserbaseSession> {
    logger.info('Attempting to create new Browserbase session.');
    // Check if we're at capacity
    if (this.activeSessions.size >= this.config.maxConcurrentSessions!) {
      logger.warn(`Max concurrent sessions reached (${this.activeSessions.size}/${this.config.maxConcurrentSessions}). Adding to queue.`);
      return new Promise((resolve, reject) => {
        this.sessionQueue.push({ options, resolve, reject })
      })
    }

    return this.createSessionInternal(options)
  }

  private async createSessionInternal(options: BrowserbaseSessionOptions): Promise<BrowserbaseSession> {
    const sessionId = `bb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    logger.info(`Creating internal session with ID: ${sessionId}`);
    
    const session: BrowserbaseSession = {
      id: sessionId,
      status: 'starting',
      createdAt: new Date(),
      metadata: {
        profile: options.profile,
        proxy: options.proxy,
        region: options.region || 'us-east-1',
        browserVersion: options.browserVersion || 'latest',
        userAgent: options.userAgent
      }
    }

    this.activeSessions.set(sessionId, session)

    try {
      const response = await this.makeApiRequest('POST', '/sessions', {
        projectId: this.config.projectId,
        region: options.region || 'us-east-1',
        browserVersion: options.browserVersion || 'latest',
        timeout: options.timeout || this.config.defaultTimeout,
        enableRecording: options.enableRecording ?? this.config.enableRecording,
        enableDebugging: options.enableDebugging ?? this.config.enableDebugging,
        viewport: options.viewport || { width: 1920, height: 1080 },
        userAgent: options.userAgent || this.generateUserAgent(options.profile),
        extraHeaders: options.extraHeaders || {},
        geolocation: options.geolocation,
        timezone: options.timezone || 'America/New_York',
        locale: options.locale || 'en-US',
        proxy: options.proxy ? this.formatProxyConfig(options.proxy) : undefined
      })

      if (response.success) {
        session.status = 'running'
        session.startedAt = new Date()
        session.browserWSEndpoint = response.data.browserWSEndpoint
        session.debuggerUrl = response.data.debuggerUrl
        session.recordingUrl = response.data.recordingUrl
        logger.info(`Session ${sessionId} created and running. WS Endpoint: ${session.browserWSEndpoint}`);

        // Set up session monitoring
        this.monitorSession(session)

        return session
      } else {
        logger.error(`Failed to create Browserbase session ${sessionId}: ${response.error}`);
        throw new Error(response.error || 'Failed to create Browserbase session')
      }

    } catch (error: any) {
      session.status = 'failed'
      session.error = error instanceof Error ? error.message : 'Unknown error'
      session.completedAt = new Date()
      logger.error(`Error during session creation for ${sessionId}: ${session.error}`);
      
      this.activeSessions.delete(sessionId)
      this.processQueue()
      
      throw error
    }
  }

  async terminateSession(sessionId: string): Promise<void> {
    logger.info(`Attempting to terminate session: ${sessionId}`);
    const session = this.activeSessions.get(sessionId)
    if (!session) {
      logger.warn(`Attempted to terminate non-existent session: ${sessionId}`);
      throw new Error(`Session ${sessionId} not found`)
    }

    try {
      await this.makeApiRequest('DELETE', `/sessions/${sessionId}`)
      
      session.status = 'completed'
      session.completedAt = new Date()
      
      if (session.startedAt) {
        session.duration = session.completedAt.getTime() - session.startedAt.getTime()
      }

      this.activeSessions.delete(sessionId)
      this.updateMetrics(session)
      this.processQueue()
      logger.info(`Session ${sessionId} terminated successfully.`);

    } catch (error: any) {
      session.status = 'failed'
      session.error = error instanceof Error ? error.message : 'Termination failed'
      session.completedAt = new Date()
      logger.error(`Error terminating session ${sessionId}: ${session.error}`);
      
      this.activeSessions.delete(sessionId)
      this.processQueue()
      
      throw error
    }
  }

  async getSession(sessionId: string): Promise<BrowserbaseSession | null> {
    logger.debug(`Fetching session: ${sessionId}`);
    const localSession = this.activeSessions.get(sessionId)
    if (localSession) {
      logger.debug(`Session ${sessionId} found in local cache.`);
      return localSession
    }

    try {
      const response = await this.makeApiRequest('GET', `/sessions/${sessionId}`)
      if (response.success) {
        logger.debug(`Session ${sessionId} fetched from API.`);
        return this.mapApiSessionToLocal(response.data)
      }
    } catch (error) {
      logger.error(`Failed to fetch session ${sessionId} from API:`, error);
    }

    return null
  }

  async listSessions(limit = 50): Promise<BrowserbaseSession[]> {
    logger.debug(`Listing sessions with limit: ${limit}`);
    try {
      const response = await this.makeApiRequest('GET', '/sessions', { limit })
      if (response.success) {
        logger.debug(`Successfully listed ${response.data.sessions.length} sessions.`);
        return response.data.sessions.map((s: any) => this.mapApiSessionToLocal(s))
      }
    } catch (error) {
      logger.error('Failed to list sessions from API:', error);
    }

    return []
  }

  async getUsage(): Promise<BrowserbaseUsage> {
    logger.debug('Fetching Browserbase usage data.');
    try {
      const response = await this.makeApiRequest('GET', '/usage')
      if (response.success) {
        this.usage = {
          sessionsUsed: response.data.sessionsUsed,
          sessionsLimit: response.data.sessionsLimit,
          minutesUsed: response.data.minutesUsed,
          minutesLimit: response.data.minutesLimit,
          storageUsed: response.data.storageUsed,
          storageLimit: response.data.storageLimit,
          bandwidthUsed: response.data.bandwidthUsed,
          bandwidthLimit: response.data.bandwidthLimit,
          resetDate: new Date(response.data.resetDate)
        }
        logger.info('Browserbase usage data updated.', this.usage);
        return this.usage
      }
    } catch (error) {
      logger.error('Failed to fetch usage from API:', error);
    }

    throw new Error('Unable to fetch usage information')
  }

  getMetrics(): BrowserbaseMetrics {
    logger.debug('Retrieving Browserbase metrics.');
    return { ...this.metrics }
  }

  getActiveSessions(): BrowserbaseSession[] {
    logger.debug('Retrieving active sessions.');
    return Array.from(this.activeSessions.values())
  }

  getQueueLength(): number {
    logger.debug('Retrieving session queue length.');
    return this.sessionQueue.length
  }

  async healthCheck(): Promise<{ healthy: boolean; latency?: number; error?: string }> {
    logger.info('Performing Browserbase health check.');
    const startTime = Date.now()
    
    try {
      const response = await this.makeApiRequest('GET', '/health')
      const latency = Date.now() - startTime
      
      if (response.success) {
        logger.info(`Browserbase health check successful. Latency: ${latency}ms`);
      } else {
        logger.error(`Browserbase health check failed: ${response.error}`);
      }
      return {
        healthy: response.success,
        latency,
        error: response.success ? undefined : response.error
      }
    } catch (error: any) {
      const latency = Date.now() - startTime;
      logger.error(`Browserbase health check failed with exception: ${error.message}. Latency: ${latency}ms`);
      return {
        healthy: false,
        latency,
        error: error instanceof Error ? error.message : 'Health check failed'
      }
    }
  }

  private async makeApiRequest(method: string, path: string, data?: any): Promise<any> {
    const url = `${this.config.endpoint}${path}`
    const headers = {
      'Authorization': `Bearer ${this.config.apiKey}`,
      'Content-Type': 'application/json',
      'User-Agent': 'FreebeeZ/1.0'
    }

    const options: RequestInit = {
      method,
      headers,
      ...(data && method !== 'GET' ? { body: JSON.stringify(data) } : {})
    }

    logger.debug(`Making API request: ${method} ${url}`);

    // Add query parameters for GET requests
    if (method === 'GET' && data) {
      const params = new URLSearchParams(data)
      const finalUrl = `${url}?${params}`
      try {
        const response = await fetch(finalUrl, options)
        return this.handleApiResponse(response)
      } catch (error) {
        logger.error(`API request failed for ${method} ${finalUrl}:`, error);
        throw error;
      }
    }

    try {
      const response = await fetch(url, options)
      return this.handleApiResponse(response)
    } catch (error) {
      logger.error(`API request failed for ${method} ${url}:`, error);
      throw error;
    }
  }

  private async handleApiResponse(response: Response): Promise<any> {
    const responseData = await response.json().catch(() => ({
      error: 'Failed to parse response JSON'
    }))

    if (response.ok) {
      logger.debug(`API response successful for ${response.url}. Status: ${response.status}`);
      return {
        success: true,
        data: responseData
      }
    } else {
      logger.error(`API response failed for ${response.url}. Status: ${response.status}, Error: ${responseData.error || response.statusText}`);
      return {
        success: false,
        error: responseData.error || `HTTP ${response.status}: ${response.statusText}`,
        status: response.status
      }
    }
  }

  private generateUserAgent(profile?: BrowserProfile): string {
    if (profile?.userAgent) {
      return profile.userAgent
    }

    const browsers = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    ]

    return browsers[Math.floor(Math.random() * browsers.length)]
  }

  private formatProxyConfig(proxy: ProxyConfig): any {
    return {
      server: proxy.url,
      username: proxy.username,
      password: proxy.password,
      type: proxy.type || 'http'
    }
  }

  private mapApiSessionToLocal(apiSession: any): BrowserbaseSession {
    return {
      id: apiSession.id,
      status: apiSession.status,
      browserWSEndpoint: apiSession.browserWSEndpoint,
      debuggerUrl: apiSession.debuggerUrl,
      recordingUrl: apiSession.recordingUrl,
      createdAt: new Date(apiSession.createdAt),
      startedAt: apiSession.startedAt ? new Date(apiSession.startedAt) : undefined,
      completedAt: apiSession.completedAt ? new Date(apiSession.completedAt) : undefined,
      duration: apiSession.duration,
      error: apiSession.error,
      metadata: apiSession.metadata || {}
    }
  }

  private monitorSession(session: BrowserbaseSession): void {
    const timeout = this.config.defaultTimeout!
    logger.debug(`Monitoring session ${session.id} for timeout of ${timeout}ms.`);
    
    setTimeout(async () => {
      if (this.activeSessions.has(session.id) && session.status === 'running') {
        logger.warn(`Session ${session.id} timed out. Attempting to terminate.`);
        try {
          await this.terminateSession(session.id)
        } catch (error) {
          logger.error(`Failed to terminate timed-out session ${session.id}:`, error);
        }
      }
    }, timeout)
  }

  private updateMetrics(session: BrowserbaseSession): void {
    this.metrics.totalSessions++
    
    if (session.duration) {
      this.metrics.totalMinutes += session.duration / (1000 * 60)
      this.metrics.averageSessionDuration = this.metrics.totalMinutes / this.metrics.totalSessions
    }

    if (session.status === 'completed') {
      this.metrics.successRate = (this.metrics.successRate * (this.metrics.totalSessions - 1) + 1) / this.metrics.totalSessions
    } else if (session.status === 'failed') {
      this.metrics.errorRate = (this.metrics.errorRate * (this.metrics.totalSessions - 1) + 1) / this.metrics.totalSessions
    }

    // Update region usage
    if (session.metadata.region) {
      const regions = [...this.metrics.mostUsedRegions]
      const regionIndex = regions.indexOf(session.metadata.region)
      if (regionIndex === -1) {
        regions.push(session.metadata.region)
      }
      this.metrics.mostUsedRegions = regions.slice(0, 5) // Keep top 5
    }

    // Update peak usage hours
    const hour = new Date().getHours()
    if (!this.metrics.peakUsageHours.includes(hour)) {
      this.metrics.peakUsageHours.push(hour)
      this.metrics.peakUsageHours.sort((a, b) => a - b)
      this.metrics.peakUsageHours = this.metrics.peakUsageHours.slice(0, 12) // Keep top 12 hours
    }
    logger.debug('Metrics updated:', this.metrics);
  }

  private startQueueProcessor(): void {
    if (this.isProcessingQueue) return
    
    this.isProcessingQueue = true
    logger.info('Starting session queue processor.');
    this.processQueue()
  }

  private async processQueue(): Promise<void> {
    logger.debug(`Processing queue. Current queue length: ${this.sessionQueue.length}, Active sessions: ${this.activeSessions.size}`);
    while (this.sessionQueue.length > 0 && this.activeSessions.size < this.config.maxConcurrentSessions!) {
      const { options, resolve, reject } = this.sessionQueue.shift()!
      logger.info('Processing next session from queue.');
      
      try {
        const session = await this.createSessionInternal(options)
        resolve(session)
      } catch (error) {
        reject(error)
      }
    }
    logger.debug('Queue processing finished.');
  }

  private startUsageMonitoring(): void {
    logger.info('Starting usage monitoring.');
    // Update usage every 5 minutes
    setInterval(async () => {
      try {
        await this.getUsage()
      } catch (error) {
        logger.error('Failed to update usage during monitoring:', error);
      }
    }, 5 * 60 * 1000)
  }

  async cleanup(): Promise<void> {
    logger.info('Cleaning up BrowserbaseAdapter.');
    // Terminate all active sessions
    const terminationPromises = Array.from(this.activeSessions.keys()).map(sessionId =>
      this.terminateSession(sessionId).catch(error =>
        logger.error(`Failed to terminate session ${sessionId} during cleanup:`, error)
      )
    )

    await Promise.all(terminationPromises)

    // Clear queue
    this.sessionQueue.forEach(({ reject }) => {
      reject(new Error('Browserbase adapter is being cleaned up'))
    })
    this.sessionQueue.length = 0

    this.isProcessingQueue = false
    logger.info('BrowserbaseAdapter cleanup complete.');
  }

  // Advanced features

  async createSessionWithRetry(
    options: BrowserbaseSessionOptions,
    maxRetries = 3,
    retryDelay = 1000
  ): Promise<BrowserbaseSession> {
    logger.info(`Attempting to create session with retry. Max retries: ${maxRetries}`);
    let lastError: Error | null = null

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this.createSession(options)
      } catch (error: any) {
        lastError = error instanceof Error ? error : new Error('Unknown error')
        logger.warn(`Session creation attempt ${attempt} failed. Error: ${lastError.message}`);
        
        if (attempt < maxRetries) {
          logger.info(`Retrying in ${retryDelay * attempt}ms...`);
          await new Promise(resolve => setTimeout(resolve, retryDelay * attempt))
        }
      }
    }

    logger.error(`All ${maxRetries} session creation attempts failed.`);
    throw lastError || new Error('Max retries exceeded')
  }

  async createSessionPool(
    count: number,
    options: BrowserbaseSessionOptions = {}
  ): Promise<BrowserbaseSession[]> {
    logger.info(`Creating session pool with ${count} sessions.`);
    const promises = Array.from({ length: count }, () => this.createSession(options))
    const results = await Promise.allSettled(promises)
    
    const sessions: BrowserbaseSession[] = []
    const errors: Error[] = []

    results.forEach(result => {
      if (result.status === 'fulfilled') {
        sessions.push(result.value)
      } else {
        errors.push(result.reason)
      }
    })

    if (errors.length > 0) {
      logger.warn(`Failed to create ${errors.length} sessions in pool:`, errors);
    }
    logger.info(`Session pool creation complete. Created ${sessions.length} sessions.`);
    return sessions
  }

  async rotateSession(sessionId: string, options: BrowserbaseSessionOptions = {}): Promise<BrowserbaseSession> {
    logger.info(`Rotating session: ${sessionId}`);
    // Terminate old session and create new one
    await this.terminateSession(sessionId)
    const newSession = await this.createSession(options);
    logger.info(`Session ${sessionId} rotated successfully to new session ${newSession.id}.`);
    return newSession;
  }

  isAtCapacity(): boolean {
    if (!this.usage) return false
    
    const atCapacity = (
      this.usage.sessionsUsed >= this.usage.sessionsLimit * 0.9 ||
      this.usage.minutesUsed >= this.usage.minutesLimit * 0.9
    );
    logger.debug(`Checking if at capacity. Result: ${atCapacity}. Usage: ${JSON.stringify(this.usage)}`);
    return atCapacity;
  }

  getRecommendedRegion(): string {
    logger.debug('Getting recommended region.');
    // Return the least used region or default
    const regionUsage = this.metrics.mostUsedRegions
    const allRegions = ['us-east-1', 'us-west-2', 'eu-west-1', 'ap-southeast-1']
    
    for (const region of allRegions) {
      if (!regionUsage.includes(region)) {
        logger.debug(`Recommended region: ${region} (least used).`);
        return region
      }
    }
    logger.debug('No least used region found. Defaulting to us-east-1.');
    return 'us-east-1' // Default fallback
  }

  async createSessionWithPuppeteer(profile: BrowserProfile, proxyUrl?: string): Promise<Page> {
    try {
      const sessionResponse = await fetch(`${this.config.baseUrl}/sessions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          projectId: this.config.projectId,
          profile: {
            userAgent: profile.userAgent,
            viewport: profile.viewport,
            locale: profile.locale,
            timezone: profile.timezone
          },
          proxy: proxyUrl ? { url: proxyUrl } : undefined
        })
      });

      if (!sessionResponse.ok) {
        throw new Error(`Failed to create Browserbase session: ${sessionResponse.statusText}`);
      }

      const sessionData = await sessionResponse.json();
      const sessionId = sessionData.id;
      const wsEndpoint = sessionData.wsEndpoint;

      this.activeSessions.set(profile.id, sessionId);

      // Connect to the remote browser
      const browser = await Browser.connect({
        browserWSEndpoint: wsEndpoint,
        defaultViewport: profile.viewport
      });

      const page = await browser.newPage();
      
      // Apply profile settings
      await this.applyProfileToPage(page, profile);

      return page;
    } catch (error) {
      console.error('Browserbase session creation failed:', error);
      throw error;
    }
  }

  private async applyProfileToPage(page: Page, profile: BrowserProfile): Promise<void> {
    // Set cookies
    if (profile.cookies && profile.cookies.length > 0) {
      await page.setCookie(...profile.cookies);
    }

    // Set localStorage and sessionStorage
    if (profile.localStorage || profile.sessionStorage) {
      await page.evaluateOnNewDocument((localStorage, sessionStorage) => {
        if (localStorage) {
          Object.entries(localStorage).forEach(([key, value]) => {
            window.localStorage.setItem(key, value);
          });
        }
        if (sessionStorage) {
          Object.entries(sessionStorage).forEach(([key, value]) => {
            window.sessionStorage.setItem(key, value);
          });
        }
      }, profile.localStorage, profile.sessionStorage);
    }
  }

  async closeSession(profileId: string): Promise<void> {
    const sessionId = this.activeSessions.get(profileId);
    if (!sessionId) return;

    try {
      await fetch(`${this.config.baseUrl}/sessions/${sessionId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`
        }
      });
      
      this.activeSessions.delete(profileId);
    } catch (error) {
      console.error('Failed to close Browserbase session:', error);
    }
  }

  async getSessionStatus(profileId: string): Promise<string> {
    const sessionId = this.activeSessions.get(profileId);
    if (!sessionId) return 'not_found';

    try {
      const response = await fetch(`${this.config.baseUrl}/sessions/${sessionId}`, {
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`
        }
      });

      if (!response.ok) return 'error';

      const data = await response.json();
      return data.status || 'unknown';
    } catch (error) {
      console.error('Failed to get session status:', error);
      return 'error';
    }
  }
}