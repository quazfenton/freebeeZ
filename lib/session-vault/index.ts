// Session Vault - Encrypted Cookie and Session Storage
import fs from 'fs/promises'
import path from 'path'
import { Cookie } from 'puppeteer'
import { CookieStore } from './cookie-store'
import { SessionData, SessionVaultConfig, SessionVaultStats, EncryptedCookie } from './types'

export class SessionVault {
  private cookieStore: CookieStore
  private sessions: Map<string, SessionData> = new Map()
  private storagePath: string
  private maxSessions: number
  private sessionTimeout: number

  constructor(private config: SessionVaultConfig) {
    this.cookieStore = new CookieStore(config.encryptionKey)
    this.storagePath = config.storagePath || path.join(process.cwd(), 'data', 'sessions')
    this.maxSessions = config.maxSessions || 1000
    this.sessionTimeout = config.sessionTimeout || 24 * 60 * 60 * 1000 // 24 hours
  }

  /**
   * Initialize the session vault, loading existing sessions from storage
   */
  async initialize(): Promise<void> {
    try {
      await fs.mkdir(this.storagePath, { recursive: true })
      await this.loadStoredSessions()
    } catch (error) {
      console.error('Failed to initialize session vault:', error)
      throw error
    }
  }

  /**
   * Save a session with encrypted cookies
   */
  async saveSession(sessionData: Omit<SessionData, 'createdAt' | 'updatedAt'>): Promise<void> {
    const now = new Date()
    const session: SessionData = {
      ...sessionData,
      createdAt: now,
      updatedAt: now,
    }

    // Encrypt cookies before storing
    const encryptedCookies = this.cookieStore.encryptCookies(session.cookies as Cookie[])
    session.cookies = encryptedCookies as EncryptedCookie[]

    // Check if we need to remove old sessions
    if (this.sessions.size >= this.maxSessions) {
      // Remove oldest session
      const oldestKey = Array.from(this.sessions.entries())
        .sort((a, b) => a[1].createdAt.getTime() - b[1].createdAt.getTime())[0][0]
      this.sessions.delete(oldestKey)
    }

    this.sessions.set(session.id, session)

    // Also save to disk
    await this.saveSessionToFile(session)
  }

  /**
   * Retrieve a session and decrypt its cookies
   */
  async getSession(sessionId: string): Promise<SessionData | null> {
    let session = this.sessions.get(sessionId)

    // If not in memory, try to load from file
    if (!session) {
      session = await this.loadSessionFromFile(sessionId)
      if (session) {
        this.sessions.set(sessionId, session)
      }
    }

    if (!session) {
      return null
    }

    // Check if session is expired
    if (session.expiresAt && new Date() > session.expiresAt) {
      await this.removeSession(sessionId)
      return null
    }

    // Decrypt cookies before returning, but don't mutate the cached session
    const decryptedCookies = this.cookieStore.decryptCookies(session.cookies as EncryptedCookie[])
    
    // Return a copy of the session with decrypted cookies
    return {
      ...session,
      cookies: decryptedCookies
    }
  }

  /**
   * Remove a session
   */
  async removeSession(sessionId: string): Promise<boolean> {
    this.sessions.delete(sessionId)
    
    // Also remove from disk
    const filePath = path.join(this.storagePath, `${sessionId}.json`)
    try {
      await fs.unlink(filePath)
      return true
    } catch {
      return false // File might not exist
    }
  }

  /**
   * Restore a session to a browser context
   */
  async restoreSessionToBrowser(sessionId: string, browserContext: any): Promise<boolean> {
    const session = await this.getSession(sessionId)
    if (!session) {
      return false
    }

    // Add cookies to browser context
    for (const cookie of session.cookies) {
      try {
        await browserContext.addCookies([cookie])
      } catch (error) {
        console.error(`Failed to add cookie to browser:`, error)
      }
    }

    // Restore localStorage and sessionStorage if possible
    // This would typically be done via browser evaluation
    if (session.localStorage) {
      // This is a simplified version - in practice you'd evaluate JS in the browser
      console.log(`Restoring localStorage for session ${sessionId}`)
    }

    return true
  }

  /**
   * Create a new session from browser context
   */
  async createSessionFromBrowser(
    sessionId: string,
    profileId: string,
    serviceId: string,
    browserContext: any,
    expiresAt?: Date
  ): Promise<void> {
    // Get cookies from browser context
    const cookies = await browserContext.cookies()
    
    // Get localStorage and sessionStorage if possible
    // This would typically be done via browser evaluation
    const localStorage: Record<string, string> = {} // To be implemented
    const sessionStorage: Record<string, string> = {} // To be implemented

    const sessionData: Omit<SessionData, 'createdAt' | 'updatedAt'> = {
      id: sessionId,
      profileId,
      serviceId,
      cookies,
      localStorage,
      sessionStorage,
      expiresAt,
    }

    await this.saveSession(sessionData)
  }

  /**
   * Get statistics about stored sessions
   */
  async getStats(): Promise<SessionVaultStats> {
    const now = new Date()
    let activeSessions = 0
    let expiredSessions = 0

    for (const session of this.sessions.values()) {
      if (session.expiresAt && now > session.expiresAt) {
        expiredSessions++
      } else {
        activeSessions++
      }
    }

    // Calculate approximate storage size
    let storageSize = 0
    for (const session of this.sessions.values()) {
      storageSize += JSON.stringify(session).length
    }

    return {
      totalSessions: this.sessions.size,
      activeSessions,
      expiredSessions,
      storageSize,
    }
  }

  /**
   * Clean up expired sessions
   */
  async cleanupExpiredSessions(): Promise<number> {
    const now = new Date()
    let cleanedCount = 0

    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.expiresAt && now > session.expiresAt) {
        await this.removeSession(sessionId)
        cleanedCount++
      }
    }

    return cleanedCount
  }

  /**
   * Load all stored sessions from disk
   */
  private async loadStoredSessions(): Promise<void> {
    try {
      const files = await fs.readdir(this.storagePath)
      for (const file of files) {
        if (file.endsWith('.json')) {
          const sessionId = path.basename(file, '.json')
          const session = await this.loadSessionFromFile(sessionId)
          if (session) {
            this.sessions.set(sessionId, session)
          }
        }
      }
    } catch (error) {
      console.warn('Could not load stored sessions:', error)
    }
  }

  /**
   * Load a session from disk
   */
  private async loadSessionFromFile(sessionId: string): Promise<SessionData | null> {
    const filePath = path.join(this.storagePath, `${sessionId}.json`)
    
    try {
      const fileContent = await fs.readFile(filePath, 'utf8')
      const encryptedSession = JSON.parse(fileContent)
      
      // Decrypt the session
      const decryptedSession = this.cookieStore.decryptSession(
        encryptedSession.encryptedData,
        this.config.encryptionKey
      )
      
      return decryptedSession
    } catch (error) {
      console.error(`Failed to load session ${sessionId} from file:`, error)
      return null
    }
  }

  /**
   * Save a session to disk
   */
  private async saveSessionToFile(session: SessionData): Promise<void> {
    const filePath = path.join(this.storagePath, `${session.id}.json`)
    
    // Encrypt the entire session before saving
    const encryptedData = this.cookieStore.encryptSession(session, this.config.encryptionKey)
    
    const sessionToSave = {
      id: session.id,
      encryptedData,
      profileId: session.profileId,
      serviceId: session.serviceId,
      createdAt: session.createdAt.toISOString(),
      updatedAt: session.updatedAt.toISOString(),
      expiresAt: session.expiresAt?.toISOString(),
    }
    
    try {
      await fs.writeFile(filePath, JSON.stringify(sessionToSave, null, 2))
    } catch (error) {
      console.error(`Failed to save session ${session.id} to file:`, error)
      throw error
    }
  }
}