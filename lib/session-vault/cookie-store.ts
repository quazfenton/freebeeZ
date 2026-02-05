// Encrypted Cookie Store for Session Vault
import crypto from 'crypto'
import fs from 'fs/promises'
import path from 'path'
import { Cookie } from 'puppeteer'
import { EncryptedCookie, SessionData } from './types'

export class CookieStore {
  private encryptionAlgorithm = 'aes-256-gcm'
  private key: Buffer

  constructor(private encryptionKey: string) {
    // Convert the encryption key to a buffer (should be 32 bytes for aes-256)
    if (encryptionKey.length < 32) {
      throw new Error('Encryption key must be at least 32 characters long')
    }
    this.key = Buffer.from(encryptionKey.substring(0, 32), 'utf8')
  }

  /**
   * Encrypt a cookie value
   */
  encryptCookie(cookie: Cookie): EncryptedCookie {
    const { value, ...cookieWithoutValue } = cookie
    const iv = crypto.randomBytes(16) // Initialization vector
    const cipher = crypto.createCipheriv(this.encryptionAlgorithm, this.key, iv)
    
    let encrypted = cipher.update(value, 'utf8', 'hex')
    encrypted += cipher.final('hex')
    
    const authTag = cipher.getAuthTag()
    
    return {
      ...cookieWithoutValue,
      encryptedValue: `${encrypted}:${iv.toString('hex')}:${authTag.toString('hex')}`
    }
  }

  /**
   * Decrypt a cookie value
   */
  decryptCookie(encryptedCookie: EncryptedCookie): Cookie {
    const [encryptedValue, ivHex, authTagHex] = encryptedCookie.encryptedValue.split(':')
    
    if (!encryptedValue || !ivHex || !authTagHex) {
      throw new Error('Invalid encrypted cookie format')
    }
    
    const iv = Buffer.from(ivHex, 'hex')
    const authTag = Buffer.from(authTagHex, 'hex')
    
    const decipher = crypto.createDecipheriv(this.encryptionAlgorithm, this.key, iv)
    decipher.setAuthTag(authTag)
    
    let decrypted = decipher.update(encryptedValue, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    
    return {
      ...encryptedCookie,
      value: decrypted
    }
  }

  /**
   * Encrypt multiple cookies
   */
  encryptCookies(cookies: Cookie[]): EncryptedCookie[] {
    return cookies.map(cookie => this.encryptCookie(cookie))
  }

  /**
   * Decrypt multiple cookies
   */
  decryptCookies(encryptedCookies: EncryptedCookie[]): Cookie[] {
    return encryptedCookies.map(cookie => this.decryptCookie(cookie))
  }

  /**
   * Encrypt session data for storage
   */
  encryptSession(sessionData: SessionData, encryptionKey: string): string {
    const iv = crypto.randomBytes(16)
    const key = Buffer.from(encryptionKey.substring(0, 32), 'utf8')
    const cipher = crypto.createCipheriv(this.encryptionAlgorithm, key, iv)
    
    // Prepare session data for encryption (convert dates to ISO strings)
    const preparedSession = {
      ...sessionData,
      createdAt: sessionData.createdAt.toISOString(),
      updatedAt: sessionData.updatedAt.toISOString(),
      expiresAt: sessionData.expiresAt?.toISOString()
    }
    
    let encrypted = cipher.update(JSON.stringify(preparedSession), 'utf8', 'hex')
    encrypted += cipher.final('hex')
    
    const authTag = cipher.getAuthTag()
    
    return `${encrypted}:${iv.toString('hex')}:${authTag.toString('hex')}`
  }

  /**
   * Decrypt session data from storage
   */
  decryptSession(encryptedSession: string, encryptionKey: string): SessionData {
    const [encryptedValue, ivHex, authTagHex] = encryptedSession.split(':')
    
    if (!encryptedValue || !ivHex || !authTagHex) {
      throw new Error('Invalid encrypted session format')
    }
    
    const iv = Buffer.from(ivHex, 'hex')
    const authTag = Buffer.from(authTagHex, 'hex')
    const key = Buffer.from(encryptionKey.substring(0, 32), 'utf8')
    
    const decipher = crypto.createDecipheriv(this.encryptionAlgorithm, key, iv)
    decipher.setAuthTag(authTag)
    
    let decrypted = decipher.update(encryptedValue, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    
    const parsed = JSON.parse(decrypted)
    
    // Convert date strings back to Date objects
    return {
      ...parsed,
      createdAt: new Date(parsed.createdAt),
      updatedAt: new Date(parsed.updatedAt),
      expiresAt: parsed.expiresAt ? new Date(parsed.expiresAt) : undefined
    }
  }
}