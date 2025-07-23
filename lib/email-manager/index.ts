// Email Management System for Temporary Emails
import axios from 'axios'

export interface EmailAccount {
  id: string
  email: string
  password?: string
  provider: string
  createdAt: Date
  expiresAt?: Date
  isActive: boolean
  messages: EmailMessage[]
}

export interface EmailMessage {
  id: string
  from: string
  to: string
  subject: string
  body: string
  html?: string
  receivedAt: Date
  isRead: boolean
  attachments?: EmailAttachment[]
}

export interface EmailAttachment {
  filename: string
  contentType: string
  size: number
  data: string // base64 encoded
}

export interface EmailProvider {
  name: string
  baseUrl: string
  domains: string[]
  features: string[]
  maxDuration: number // in minutes
  requiresRegistration: boolean
}

export abstract class TempEmailService {
  protected provider: EmailProvider

  constructor(provider: EmailProvider) {
    this.provider = provider
  }

  abstract createEmail(username?: string): Promise<EmailAccount>
  abstract getMessages(email: string): Promise<EmailMessage[]>
  abstract deleteEmail(email: string): Promise<boolean>
  abstract extendExpiry(email: string, minutes: number): Promise<boolean>
}

// 10MinuteMail.com integration
export class TenMinuteMailService extends TempEmailService {
  constructor() {
    super({
      name: '10MinuteMail',
      baseUrl: 'https://10minutemail.com',
      domains: ['10minutemail.com'],
      features: ['temporary', 'auto-expire'],
      maxDuration: 10,
      requiresRegistration: false
    })
  }

  async createEmail(username?: string): Promise<EmailAccount> {
    try {
      const response = await axios.get(`${this.provider.baseUrl}/10MinuteMail/resources/session/address`)
      
      const email = response.data.address
      const sessionId = response.data.sessionId

      return {
        id: sessionId,
        email,
        provider: this.provider.name,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
        isActive: true,
        messages: []
      }
    } catch (error) {
      throw new Error(`Failed to create 10MinuteMail account: ${error}`)
    }
  }

  async getMessages(email: string): Promise<EmailMessage[]> {
    try {
      const response = await axios.get(`${this.provider.baseUrl}/10MinuteMail/resources/messages/messagesAfter/0`)
      
      return response.data.map((msg: any) => ({
        id: msg.id,
        from: msg.sender,
        to: email,
        subject: msg.subject,
        body: msg.bodyPreview,
        html: msg.bodyHtmlContent,
        receivedAt: new Date(msg.receivedAt),
        isRead: false,
        attachments: msg.attachments || []
      }))
    } catch (error) {
      console.error('Failed to get messages:', error)
      return []
    }
  }

  async deleteEmail(email: string): Promise<boolean> {
    // 10MinuteMail emails auto-expire, no manual deletion needed
    return true
  }

  async extendExpiry(email: string, minutes: number): Promise<boolean> {
    // 10MinuteMail doesn't support extending expiry
    return false
  }
}

// TempMail.org integration
export class TempMailService extends TempEmailService {
  private apiKey: string

  constructor(apiKey?: string) {
    super({
      name: 'TempMail',
      baseUrl: 'https://api.tempmail.org/v1',
      domains: ['tempmail.org', '1secmail.com', '1secmail.net'],
      features: ['temporary', 'multiple-domains', 'api'],
      maxDuration: 60,
      requiresRegistration: false
    })
    this.apiKey = apiKey || ''
  }

  async createEmail(username?: string): Promise<EmailAccount> {
    try {
      const domains = await this.getAvailableDomains()
      const domain = domains[Math.floor(Math.random() * domains.length)]
      const user = username || this.generateRandomUsername()
      const email = `${user}@${domain}`

      return {
        id: email,
        email,
        provider: this.provider.name,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
        isActive: true,
        messages: []
      }
    } catch (error) {
      throw new Error(`Failed to create TempMail account: ${error}`)
    }
  }

  async getMessages(email: string): Promise<EmailMessage[]> {
    try {
      const [username, domain] = email.split('@')
      const response = await axios.get(`${this.provider.baseUrl}/getMessages`, {
        params: { login: username, domain }
      })

      return response.data.map((msg: any) => ({
        id: msg.id,
        from: msg.from,
        to: email,
        subject: msg.subject,
        body: msg.textBody,
        html: msg.htmlBody,
        receivedAt: new Date(msg.date),
        isRead: false,
        attachments: msg.attachments || []
      }))
    } catch (error) {
      console.error('Failed to get messages:', error)
      return []
    }
  }

  async deleteEmail(email: string): Promise<boolean> {
    // TempMail emails auto-expire, no manual deletion needed
    return true
  }

  async extendExpiry(email: string, minutes: number): Promise<boolean> {
    // TempMail doesn't support extending expiry
    return false
  }

  private async getAvailableDomains(): Promise<string[]> {
    try {
      const response = await axios.get(`${this.provider.baseUrl}/getDomainList`)
      return response.data
    } catch (error) {
      // Fallback to known domains
      return ['1secmail.com', '1secmail.net', '1secmail.org']
    }
  }

  private generateRandomUsername(): string {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
    let result = ''
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result
  }
}

// Guerrilla Mail integration
export class GuerrillaMailService extends TempEmailService {
  constructor() {
    super({
      name: 'GuerrillaMail',
      baseUrl: 'https://api.guerrillamail.com/ajax.php',
      domains: ['guerrillamail.com', 'guerrillamail.net'],
      features: ['temporary', 'custom-alias'],
      maxDuration: 60,
      requiresRegistration: false
    })
  }

  async createEmail(username?: string): Promise<EmailAccount> {
    try {
      const params = new URLSearchParams({
        f: 'get_email_address',
        ip: '127.0.0.1',
        agent: 'Mozilla_5_0'
      })

      if (username) {
        params.append('email_user', username)
      }

      const response = await axios.post(this.provider.baseUrl, params)
      
      return {
        id: response.data.sid_token,
        email: response.data.email_addr,
        provider: this.provider.name,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
        isActive: true,
        messages: []
      }
    } catch (error) {
      throw new Error(`Failed to create GuerrillaMail account: ${error}`)
    }
  }

  async getMessages(email: string): Promise<EmailMessage[]> {
    try {
      const params = new URLSearchParams({
        f: 'get_email_list',
        offset: '0'
      })

      const response = await axios.post(this.provider.baseUrl, params)
      
      return response.data.list.map((msg: any) => ({
        id: msg.mail_id,
        from: msg.mail_from,
        to: email,
        subject: msg.mail_subject,
        body: msg.mail_excerpt,
        receivedAt: new Date(msg.mail_timestamp * 1000),
        isRead: msg.mail_read === '1',
        attachments: []
      }))
    } catch (error) {
      console.error('Failed to get messages:', error)
      return []
    }
  }

  async deleteEmail(email: string): Promise<boolean> {
    // GuerrillaMail emails auto-expire
    return true
  }

  async extendExpiry(email: string, minutes: number): Promise<boolean> {
    try {
      const params = new URLSearchParams({
        f: 'extend_inbox',
        minutes: minutes.toString()
      })

      const response = await axios.post(this.provider.baseUrl, params)
      return response.data.success === true
    } catch (error) {
      return false
    }
  }
}

// Email Manager that handles multiple providers
export class EmailManager {
  private services: Map<string, TempEmailService> = new Map()
  private accounts: Map<string, EmailAccount> = new Map()
  private defaultService: string | null = null

  constructor() {
    // Initialize default services
    this.addService('10minutemail', new TenMinuteMailService(), true)
    this.addService('tempmail', new TempMailService())
    this.addService('guerrillamail', new GuerrillaMailService())
  }

  addService(name: string, service: TempEmailService, isDefault = false): void {
    this.services.set(name, service)
    if (isDefault || this.defaultService === null) {
      this.defaultService = name
    }
  }

  async createEmail(username?: string, serviceName?: string): Promise<EmailAccount> {
    const service = this.getService(serviceName)
    if (!service) {
      throw new Error(`Email service ${serviceName || this.defaultService} not found`)
    }

    const account = await service.createEmail(username)
    this.accounts.set(account.email, account)
    return account
  }

  async getMessages(email: string): Promise<EmailMessage[]> {
    const account = this.accounts.get(email)
    if (!account) {
      throw new Error(`Email account ${email} not found`)
    }

    const service = this.services.get(account.provider.toLowerCase())
    if (!service) {
      throw new Error(`Service for ${email} not found`)
    }

    const messages = await service.getMessages(email)
    account.messages = messages
    return messages
  }

  async waitForEmail(email: string, timeout = 60000, checkInterval = 5000): Promise<EmailMessage[]> {
    const startTime = Date.now()
    
    while (Date.now() - startTime < timeout) {
      const messages = await this.getMessages(email)
      if (messages.length > 0) {
        return messages
      }
      
      await this.sleep(checkInterval)
    }
    
    throw new Error(`Timeout waiting for email to ${email}`)
  }

  async findVerificationEmail(email: string, keywords: string[] = ['verify', 'confirm', 'activate']): Promise<EmailMessage | null> {
    const messages = await this.getMessages(email)
    
    for (const message of messages) {
      const content = `${message.subject} ${message.body}`.toLowerCase()
      if (keywords.some(keyword => content.includes(keyword.toLowerCase()))) {
        return message
      }
    }
    
    return null
  }

  async extractVerificationLink(message: EmailMessage): Promise<string | null> {
    const content = message.html || message.body
    const linkRegex = /https?:\/\/[^\s<>"]+(?:verify|confirm|activate)[^\s<>"]*/gi
    const matches = content.match(linkRegex)
    
    return matches ? matches[0] : null
  }

  async deleteEmail(email: string): Promise<boolean> {
    const account = this.accounts.get(email)
    if (!account) {
      return false
    }

    const service = this.services.get(account.provider.toLowerCase())
    if (!service) {
      return false
    }

    const result = await service.deleteEmail(email)
    if (result) {
      this.accounts.delete(email)
    }
    
    return result
  }

  getAccounts(): EmailAccount[] {
    return Array.from(this.accounts.values())
  }

  private getService(name?: string): TempEmailService | null {
    const serviceName = name || this.defaultService
    return serviceName ? this.services.get(serviceName) || null : null
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}