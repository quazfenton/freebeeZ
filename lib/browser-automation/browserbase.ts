// Browserbase Integration for FreebeeZ
// Provides cloud-based browser automation with advanced features

import { BrowserProfile } from './index'
import { ProxyConfig } from '../types'

export interface BrowserbaseConfig {
  apiKey: string
  endpoint?: string
  projectId?: string
  defaultTimeout?: number
  maxConcurrentSessions?: number
  enableRecording?: boolean
  enableDebugging?: boolean
}

export interface BrowserbaseSession {
  id: string
  status: 'starting' | 'running' | 'completed' | 'failed' | 'timeout'
  browserWSEndpoint?: string
  debuggerUrl?: string
  recordingUrl?: string
  createdAt: Date
  startedAt?: Date
  completedAt?: Date
  duration?: number
  error?: string
  metadata: {
    profile?: BrowserProfile
    proxy?: ProxyConfig
    region?: string
    browserVersion?: string
    userAgent?: string
  }
}

export interface BrowserbaseSessionOptions {
  profile?: BrowserProfile
  proxy?: ProxyConfig
  region?: 'us-east-1' | 'us-west-2' | 'eu-west-1' | 'ap-southeast-1'
  browserVersion?: string
  timeout?: number
  enableRecording?: boolean
  enableDebugging?: boolean
  viewport?: { width: number; height: number }
  userAgent?: string
  extraHeaders?: Record<string, string>
  geolocation?: { latitude: number; longitude: number }
  timezone?: string
  locale?: string
}

export interface BrowserbaseUsage {
  sessionsUsed: number
  sessionsLimit: number
  minutesUsed: number
  minutesLimit: number
  storageUsed: number
  storageLimit: number
  bandwidthUsed: number
  bandwidthLimit: number
  resetDate: Date
}

export interface BrowserbaseMetrics {
  averageSessionDuration: number
  successRate: number
  errorRate: number
  mostUsedRegions: string[]
  peakUsageHours: number[]
  totalSessions: number
  totalMinutes: number
}

export class BrowserbaseAdapter {
  private config: BrowserbaseConfig
  private activeSessions: Map<string, BrowserbaseSession> = new Map()
  private sessionQueue: Array<{ options: BrowserbaseSessionOptions; resolve: Function; reject: Function }> = []
  private isProcessingQueue = false
  private usage?: BrowserbaseUsage
  private metrics: BrowserbaseMetrics = {
    averageSessionDuration: 0,
    successRate: 0,
    errorRate: 0,
    mostUsedRegions: [],
    peakUsageHours: [],
    totalSessions: 0,
    totalMinutes: 0
  }

  constructor(config: BrowserbaseConfig) {
    this.config = {
      endpoint: 'https://api.browserbase.com',
      defaultTimeout: 300000, // 5 minutes
      maxConcurrentSessions: 5,
      enableRecording: false,
      enableDebugging: false,
      ...config
    }
    
    this.startQueueProcessor()
    this.startUsageMonitoring()
  }

  async createSession(options: BrowserbaseSessionOptions = {}): Promise<BrowserbaseSession> {
    // Check if we're at capacity
    if (this.activeSessions.size >= this.config.maxConcurrentSessions!) {
      return new Promise((resolve, reject) => {
        this.sessionQueue.push({ options, resolve, reject })
      })
    }

    return this.createSessionInternal(options)
  }

  private async createSessionInternal(options: BrowserbaseSessionOptions): Promise<BrowserbaseSession> {
    const sessionId = `bb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
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

        // Set up session monitoring
        this.monitorSession(session)

        return session
      } else {
        throw new Error(response.error || 'Failed to create Browserbase session')
      }

    } catch (error) {
      session.status = 'failed'
      session.error = error instanceof Error ? error.message : 'Unknown error'
      session.completedAt = new Date()
      
      this.activeSessions.delete(sessionId)
      this.processQueue()
      
      throw error
    }
  }

  async terminateSession(sessionId: string): Promise<void> {
    const session = this.activeSessions.get(sessionId)
    if (!session) {
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

    } catch (error) {
      session.status = 'failed'
      session.error = error instanceof Error ? error.message : 'Termination failed'
      session.completedAt = new Date()
      
      this.activeSessions.delete(sessionId)
      this.processQueue()
      
      throw error
    }
  }

  async getSession(sessionId: string): Promise<BrowserbaseSession | null> {
    const localSession = this.activeSessions.get(sessionId)
    if (localSession) {
      return localSession
    }

    try {
      const response = await this.makeApiRequest('GET', `/sessions/${sessionId}`)
      if (response.success) {
        return this.mapApiSessionToLocal(response.data)
      }
    } catch (error) {
      console.error(`Failed to fetch session ${sessionId}:`, error)
    }

    return null
  }

  async listSessions(limit = 50): Promise<BrowserbaseSession[]> {
    try {
      const response = await this.makeApiRequest('GET', '/sessions', { limit })
      if (response.success) {
        return response.data.sessions.map((s: any) => this.mapApiSessionToLocal(s))
      }
    } catch (error) {
      console.error('Failed to list sessions:', error)
    }

    return []
  }

  async getUsage(): Promise<BrowserbaseUsage> {
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
        return this.usage
      }
    } catch (error) {
      console.error('Failed to fetch usage:', error)
    }

    throw new Error('Unable to fetch usage information')
  }

  getMetrics(): BrowserbaseMetrics {
    return { ...this.metrics }
  }

  getActiveSessions(): BrowserbaseSession[] {
    return Array.from(this.activeSessions.values())
  }

  getQueueLength(): number {
    return this.sessionQueue.length
  }

  async healthCheck(): Promise<{ healthy: boolean; latency?: number; error?: string }> {
    const startTime = Date.now()
    
    try {
      const response = await this.makeApiRequest('GET', '/health')
      const latency = Date.now() - startTime
      
      return {
        healthy: response.success,
        latency,
        error: response.success ? undefined : response.error
      }
    } catch (error) {
      return {
        healthy: false,
        latency: Date.now() - startTime,
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

    // Add query parameters for GET requests
    if (method === 'GET' && data) {
      const params = new URLSearchParams(data)
      const finalUrl = `${url}?${params}`
      const response = await fetch(finalUrl, options)
      return this.handleApiResponse(response)
    }

    const response = await fetch(url, options)
    return this.handleApiResponse(response)
  }

  private async handleApiResponse(response: Response): Promise<any> {
    const responseData = await response.json().catch(() => ({}))

    if (response.ok) {
      return {
        success: true,
        data: responseData
      }
    } else {
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

    // Generate a realistic user agent
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
    
    setTimeout(async () => {
      if (this.activeSessions.has(session.id) && session.status === 'running') {
        try {
          await this.terminateSession(session.id)
        } catch (error) {
          console.error(`Failed to terminate timed-out session ${session.id}:`, error)
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
  }

  private startQueueProcessor(): void {
    if (this.isProcessingQueue) return
    
    this.isProcessingQueue = true
    this.processQueue()
  }

  private async processQueue(): Promise<void> {
    while (this.sessionQueue.length > 0 && this.activeSessions.size < this.config.maxConcurrentSessions!) {
      const { options, resolve, reject } = this.sessionQueue.shift()!
      
      try {
        const session = await this.createSessionInternal(options)
        resolve(session)
      } catch (error) {
        reject(error)
      }
    }
  }

  private startUsageMonitoring(): void {
    // Update usage every 5 minutes
    setInterval(async () => {
      try {
        await this.getUsage()
      } catch (error) {
        console.error('Failed to update usage:', error)
      }
    }, 5 * 60 * 1000)
  }

  async cleanup(): Promise<void> {
    // Terminate all active sessions
    const terminationPromises = Array.from(this.activeSessions.keys()).map(sessionId =>
      this.terminateSession(sessionId).catch(error =>
        console.error(`Failed to terminate session ${sessionId}:`, error)
      )
    )

    await Promise.all(terminationPromises)

    // Clear queue
    this.sessionQueue.forEach(({ reject }) => {
      reject(new Error('Browserbase adapter is being cleaned up'))
    })
    this.sessionQueue.length = 0

    this.isProcessingQueue = false
  }

  // Advanced features

  async createSessionWithRetry(
    options: BrowserbaseSessionOptions,
    maxRetries = 3,
    retryDelay = 1000
  ): Promise<BrowserbaseSession> {
    let lastError: Error | null = null

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this.createSession(options)
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error')
        
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, retryDelay * attempt))
        }
      }
    }

    throw lastError || new Error('Max retries exceeded')
  }

  async createSessionPool(
    count: number,
    options: BrowserbaseSessionOptions = {}
  ): Promise<BrowserbaseSession[]> {
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
      console.warn(`Failed to create ${errors.length} sessions:`, errors)
    }

    return sessions
  }

  async rotateSession(sessionId: string, options: BrowserbaseSessionOptions = {}): Promise<BrowserbaseSession> {
    // Terminate old session and create new one
    await this.terminateSession(sessionId)
    return this.createSession(options)
  }

  isAtCapacity(): boolean {
    if (!this.usage) return false
    
    return (
      this.usage.sessionsUsed >= this.usage.sessionsLimit * 0.9 ||
      this.usage.minutesUsed >= this.usage.minutesLimit * 0.9
    )
  }

  getRecommendedRegion(): string {
    // Return the least used region or default
    const regionUsage = this.metrics.mostUsedRegions
    const allRegions = ['us-east-1', 'us-west-2', 'eu-west-1', 'ap-southeast-1']
    
    for (const region of allRegions) {
      if (!regionUsage.includes(region)) {
        return region
      }
    }

    return 'us-east-1' // Default fallback
  }
}