// Enhanced Browserbase Adapter for FreebeeZ
// Provides comprehensive cloud-based browser automation

import { Browser, Page, BrowserContextOptions } from 'puppeteer-core'
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
  page?: Page
  browser?: Browser
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

/**
 * Enhanced Browserbase Adapter with advanced features
 */
export class BrowserbaseAdapter {
  private config: BrowserbaseConfig
  private activeSessions: Map<string, BrowserbaseSession> = new Map()
  private sessionQueue: Array<{ options: BrowserbaseSessionOptions; resolve: Function; reject: Function }> = []
  private isProcessingQueue = false
  private usage?: BrowserbaseUsage
  private connectionPool: Map<string, Browser> = new Map()

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

  async initialize(): Promise<void> {
    // Test connection to Browserbase
    await this.healthCheck()
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
      // Create session via Browserbase API
      const response = await this.makeApiRequest('POST', '/sessions', {
        projectId: this.config.projectId,
        region: options.region || 'us-east-1',
        browserVersion: options.browserVersion || 'latest',
        timeout: options.timeout || this.config.defaultTimeout,
        enableRecording: options.enableRecording ?? this.config.enableRecording,
        enableDebugging: options.enableDebugging ?? this.config.enableDebugging,
        viewport: options.viewport || options.profile?.viewport || { width: 1920, height: 1080 },
        userAgent: options.userAgent || options.profile?.userAgent || this.generateUserAgent(),
        extraHeaders: options.extraHeaders || {},
        geolocation: options.geolocation,
        timezone: options.timezone || options.profile?.timezone || 'America/New_York',
        locale: options.locale || options.profile?.locale || 'en-US',
        proxy: options.proxy ? this.formatProxyConfig(options.proxy) : undefined
      })

      if (response.success) {
        session.status = 'running'
        session.startedAt = new Date()
        session.browserWSEndpoint = response.data.browserWSEndpoint
        session.debuggerUrl = response.data.debuggerUrl
        session.recordingUrl = response.data.recordingUrl

        // Connect to the browser
        const browser = await this.connectToBrowser(session.browserWSEndpoint!)
        const page = await browser.newPage()

        // Apply profile settings
        if (options.profile) {
          await this.applyProfile(page, options.profile)
        }

        session.browser = browser
        session.page = page

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

  private async connectToBrowser(wsEndpoint: string): Promise<Browser> {
    // Check if we already have a connection to this endpoint
    if (this.connectionPool.has(wsEndpoint)) {
      const existingBrowser = this.connectionPool.get(wsEndpoint)!
      if (existingBrowser.isConnected()) {
        return existingBrowser
      } else {
        this.connectionPool.delete(wsEndpoint)
      }
    }

    const puppeteer = require('puppeteer-core')
    const browser = await puppeteer.connect({
      browserWSEndpoint: wsEndpoint,
      defaultViewport: null
    })

    this.connectionPool.set(wsEndpoint, browser)
    return browser
  }

  private async applyProfile(page: Page, profile: BrowserProfile): Promise<void> {
    try {
      // Set viewport
      if (profile.viewport) {
        await page.setViewport(profile.viewport)
      }

      // Set user agent
      if (profile.userAgent) {
        await page.setUserAgent(profile.userAgent)
      }

      // Set extra headers
      await page.setExtraHTTPHeaders({
        'Accept-Language': profile.locale || 'en-US,en;q=0.9'
      })

      // Set cookies
      if (profile.cookies && profile.cookies.length > 0) {
        await page.setCookie(...profile.cookies)
      }

      // Set localStorage and sessionStorage
      if (profile.localStorage || profile.sessionStorage) {
        await page.evaluateOnNewDocument((localStorage, sessionStorage) => {
          if (localStorage) {
            Object.entries(localStorage).forEach(([key, value]) => {
              window.localStorage.setItem(key, value)
            })
          }
          if (sessionStorage) {
            Object.entries(sessionStorage).forEach(([key, value]) => {
              window.sessionStorage.setItem(key, value)
            })
          }
        }, profile.localStorage, profile.sessionStorage)
      }

      // Apply fingerprint spoofing
      if (profile.fingerprint) {
        await this.applyFingerprint(page, profile.fingerprint)
      }

    } catch (error) {
      console.warn('Failed to apply some profile settings:', error)
    }
  }

  private async applyFingerprint(page: Page, fingerprint: any): Promise<void> {
    await page.evaluateOnNewDocument((fp) => {
      // Override screen properties
      if (fp.screen) {
        Object.defineProperty(screen, 'width', { value: fp.screen.width })
        Object.defineProperty(screen, 'height', { value: fp.screen.height })
        Object.defineProperty(screen, 'colorDepth', { value: fp.screen.colorDepth })
      }

      // Override navigator properties
      if (fp.languages) {
        Object.defineProperty(navigator, 'languages', { value: fp.languages })
      }

      // Override plugins
      if (fp.plugins) {
        Object.defineProperty(navigator, 'plugins', { value: fp.plugins })
      }

      // Canvas fingerprint spoofing
      if (fp.canvas) {
        const originalToDataURL = HTMLCanvasElement.prototype.toDataURL
        HTMLCanvasElement.prototype.toDataURL = function() {
          return fp.canvas
        }
      }

      // WebGL fingerprint spoofing
      if (fp.webgl) {
        const originalGetParameter = WebGLRenderingContext.prototype.getParameter
        WebGLRenderingContext.prototype.getParameter = function(parameter) {
          if (parameter === 37445) return fp.webgl // UNMASKED_VENDOR_WEBGL
          if (parameter === 37446) return fp.webgl // UNMASKED_RENDERER_WEBGL
          return originalGetParameter.call(this, parameter)
        }
      }
    }, fingerprint)
  }

  async terminateSession(sessionId: string): Promise<void> {
    const session = this.activeSessions.get(sessionId)
    if (!session) {
      throw new Error(`Session ${sessionId} not found`)
    }

    try {
      // Close page and browser
      if (session.page) {
        await session.page.close()
      }
      if (session.browser) {
        await session.browser.disconnect()
      }

      // Terminate session via API
      await this.makeApiRequest('DELETE', `/sessions/${sessionId}`)
      
      session.status = 'completed'
      session.completedAt = new Date()
      
      if (session.startedAt) {
        session.duration = session.completedAt.getTime() - session.startedAt.getTime()
      }

      this.activeSessions.delete(sessionId)
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

  async rotateProxy(sessionId: string, newProxy: ProxyConfig): Promise<void> {
    const session = this.activeSessions.get(sessionId)
    if (!session) {
      throw new Error(`Session ${sessionId} not found`)
    }

    try {
      await this.makeApiRequest('PUT', `/sessions/${sessionId}/proxy`, {
        proxy: this.formatProxyConfig(newProxy)
      })

      session.metadata.proxy = newProxy
    } catch (error) {
      throw new Error(`Failed to rotate proxy for session ${sessionId}: ${error}`)
    }
  }

  async getSession(sessionId: string): Promise<BrowserbaseSession | null> {
    return this.activeSessions.get(sessionId) || null
  }

  async listSessions(): Promise<BrowserbaseSession[]> {
    return Array.from(this.activeSessions.values())
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

  getActiveSessions(): BrowserbaseSession[] {
    return Array.from(this.activeSessions.values())
  }

  getQueueLength(): number {
    return this.sessionQueue.length
  }

  isAtCapacity(): boolean {
    if (!this.usage) return false
    
    return (
      this.usage.sessionsUsed >= this.usage.sessionsLimit * 0.9 ||
      this.usage.minutesUsed >= this.usage.minutesLimit * 0.9
    )
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

    const doFetch = async (finalUrl: string) => {
      const start = Date.now()
      const response = await fetch(finalUrl, options)
      const latency = Date.now() - start
      // Optionally track bandwidth/latency metrics per call
      try {
        // naive bandwidth estimation from content-length header
        const clen = response.headers.get('content-length')
        if (clen) {
          // could persist to a metrics store if needed
        }
      } catch {}
      const res = await this.handleApiResponse(response)
      if (!res.success) {
        ;(res as any).latency = latency
      } else {
        ;(res as any).latency = latency
      }
      return res
    }

    // Add query parameters for GET requests
    const targetUrl = method === 'GET' && data ? `${url}?${new URLSearchParams(data)}` : url

    // Retry with exponential backoff on transient errors
    const maxRetries = 3
    let attempt = 0
    let lastErr: any
    while (attempt <= maxRetries) {
      try {
        return await doFetch(targetUrl)
      } catch (e) {
        lastErr = e
      }
      attempt++
      const backoff = Math.min(1000 * Math.pow(2, attempt), 8000)
      await new Promise(r => setTimeout(r, backoff))
    }
    throw lastErr || new Error('Browserbase request failed after retries')
  }

  private async handleApiResponse(response: Response): Promise<any> {
    const responseData = await response.json().catch(() => ({}))

    if (response.ok) {
      return {
        success: true,
        data: responseData
      }
    } else {
      // Map common failure modes to clearer errors
      let errorMsg = responseData.error || `HTTP ${response.status}: ${response.statusText}`
      if (response.status === 401 || response.status === 403) {
        errorMsg = 'Authentication failed for Browserbase API. Check BROWSERBASE_API_KEY and permissions.'
      } else if (response.status === 429) {
        errorMsg = 'Browserbase rate limit reached. Consider reducing concurrency or increasing plan limits.'
      } else if (response.status >= 500) {
        errorMsg = `Browserbase service error (${response.status}). Please retry later.`
      }
      return {
        success: false,
        error: errorMsg,
        status: response.status
      }
    }
  }

  private generateUserAgent(): string {
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

    // Close all browser connections
    for (const browser of this.connectionPool.values()) {
      try {
        await browser.disconnect()
      } catch (error) {
        console.error('Failed to disconnect browser:', error)
      }
    }
    this.connectionPool.clear()

    // Clear queue
    this.sessionQueue.forEach(({ reject }) => {
      reject(new Error('Browserbase adapter is being cleaned up'))
    })
    this.sessionQueue.length = 0

    this.isProcessingQueue = false
  }
}