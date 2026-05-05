// Types for Session Vault
import { Cookie } from 'puppeteer'

export interface SessionData {
  id: string
  profileId: string
  serviceId: string
  cookies: EncryptedCookie[]
  localStorage: Record<string, string>
  sessionStorage: Record<string, string>
  createdAt: Date
  updatedAt: Date
  expiresAt?: Date
}

export interface EncryptedCookie extends Omit<Cookie, 'value'> {
  encryptedValue: string
}

export interface SessionVaultConfig {
  encryptionKey: string
  storagePath?: string
  maxSessions?: number
  sessionTimeout?: number // in milliseconds
}

export interface SessionVaultStats {
  totalSessions: number
  activeSessions: number
  expiredSessions: number
  storageSize: number
}