// Email Protocol Adapter for Universal Connector
// Direct email account access for verification (IMAP/SMTP)
import { ImapClient } from 'emailjs-imap-client'
import { SMTPClient } from 'emailjs-smtp-client'
import {
  ConnectionAdapter,
  ConnectionMethodType,
  ConnectionConfig,
  ConnectionCredentials,
  ServiceConnection,
  ConnectionResult,
  ConnectionUsage,
  ConnectorCapabilities,
} from '../types'

export interface EmailConnectionConfig extends ConnectionConfig {
  imapHost: string
  imapPort: number
  smtpHost: string
  smtpPort: number
  username: string
  password: string
  useSSL?: boolean
  useTLS?: boolean
}

export interface EmailMessage {
  id: string
  subject: string
  from: string
  to: string
  date: Date
  body: string
  attachments: EmailAttachment[]
}

export interface EmailAttachment {
  filename: string
  mimeType: string
  size: number
  content: Buffer
}

export interface SendEmailParams {
  to: string | string[]
  subject: string
  body: string
  html?: string
  attachments?: EmailAttachment[]
}

export class EmailAdapter implements ConnectionAdapter {
  type = ConnectionMethodType.EMAIL
  private clients: Map<string, { imap: ImapClient, smtp: SMTPClient }> = new Map()
  private usage: Map<string, ConnectionUsage> = new Map()
  private configs: Map<string, EmailConnectionConfig> = new Map()

  async connect(config: EmailConnectionConfig): Promise<ServiceConnection> {
    const connectionId = `email_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    this.configs.set(connectionId, config)
    this.usage.set(connectionId, this.createEmptyUsage())

    const imapClient = new ImapClient(config.imapHost, config.imapPort, {
      auth: {
        user: config.username,
        pass: config.password,
      },
      useSecureTransport: config.useSSL || config.useTLS || false,
    })

    const smtpClient = new SMTPClient({
      host: config.smtpHost,
      port: config.smtpPort,
      secure: config.useSSL || false,
      requireTLS: config.useTLS || false,
      auth: {
        user: config.username,
        pass: config.password,
      },
    })

    try {
      await imapClient.connect()
      await imapClient.selectMailbox('INBOX')
      
      this.clients.set(connectionId, { imap: imapClient, smtp: smtpClient })
      
      return {
        id: connectionId,
        serviceId: config.endpoint || 'email',
        method: ConnectionMethodType.EMAIL,
        status: 'connected',
        config,
        credentials: config.credentials,
        capabilities: this.getCapabilities(),
        usage: this.usage.get(connectionId)!,
        healthCheck: () => this.healthCheck({ id: connectionId } as ServiceConnection),
        createdAt: new Date(),
      }
    } catch (error) {
      throw new Error(`Failed to connect to email server: ${error.message}`)
    }
  }

  async disconnect(connectionId: string): Promise<boolean> {
    const clients = this.clients.get(connectionId)
    if (clients) {
      try {
        await clients.imap.closeBox()
        await clients.imap.logout()
        await clients.smtp.quit()
      } catch (error) {
        console.error('Error disconnecting email clients:', error)
      }
      this.clients.delete(connectionId)
    }
    
    this.configs.delete(connectionId)
    this.usage.delete(connectionId)
    
    return true
  }

  async execute<T>(
    connection: ServiceConnection,
    action: string,
    params: Record<string, any>
  ): Promise<ConnectionResult<T>> {
    const startTime = Date.now()
    const clients = this.clients.get(connection.id)
    const usage = this.usage.get(connection.id)!

    if (!clients) {
      return {
        success: false,
        error: 'Email connection not established',
        duration: 0,
        retryCount: 0,
        method: this.type,
      }
    }

    usage.totalRequests++

    try {
      let result: any

      switch (action.toLowerCase()) {
        case 'fetch-messages':
          result = await this.fetchMessages(clients.imap, params.folder || 'INBOX', params.limit || 10)
          break
        case 'fetch-unread':
          result = await this.fetchUnreadMessages(clients.imap, params.folder || 'INBOX', params.limit || 10)
          break
        case 'search-messages':
          result = await this.searchMessages(clients.imap, params.criteria || {}, params.folder || 'INBOX')
          break
        case 'get-message':
          result = await this.getMessage(clients.imap, params.messageId)
          break
        case 'delete-message':
          result = await this.deleteMessage(clients.imap, params.messageId, params.folder || 'INBOX')
          break
        case 'send-email':
          result = await this.sendEmail(clients.smtp, params.email as SendEmailParams)
          break
        case 'extract-links':
          result = await this.extractLinksFromMessages(clients.imap, params.searchTerm || '', params.limit || 5)
          break
        default:
          throw new Error(`Unsupported email action: ${action}`)
      }

      const duration = Date.now() - startTime
      usage.successfulRequests++
      usage.averageResponseTime =
        (usage.averageResponseTime * (usage.successfulRequests - 1) + duration) /
        usage.successfulRequests
      usage.lastRequestTime = new Date()

      return {
        success: true,
        data: result as T,
        duration,
        retryCount: 0,
        method: this.type,
      }
    } catch (error: any) {
      const duration = Date.now() - startTime
      usage.failedRequests++

      return {
        success: false,
        error: error.message,
        duration,
        retryCount: 0,
        method: this.type,
      }
    }
  }

  async healthCheck(connection: ServiceConnection): Promise<boolean> {
    const clients = this.clients.get(connection.id)
    if (!clients) return false

    try {
      // Try to get mailbox status to verify connection
      await clients.imap.selectMailbox('INBOX')
      return true
    } catch {
      return false
    }
  }

  async refreshCredentials(connection: ServiceConnection): Promise<ConnectionCredentials> {
    const config = this.configs.get(connection.id)
    return {
      username: config?.username,
      password: config?.password ? '[encrypted]' : undefined,
    }
  }

  private async fetchMessages(imapClient: ImapClient, folder: string, limit: number): Promise<EmailMessage[]> {
    const messages = await imapClient.listMessages(folder, '1:*', ['uid', 'flags', 'envelope', 'body[]'])
    
    // Sort by date descending and limit
    const sortedMessages = messages.sort((a, b) => {
      const dateA = new Date(a.envelope.date).getTime()
      const dateB = new Date(b.envelope.date).getTime()
      return dateB - dateA
    }).slice(0, limit)

    return sortedMessages.map(msg => ({
      id: msg.uid.toString(),
      subject: msg.envelope.subject || '',
      from: Array.isArray(msg.envelope.from) ? msg.envelope.from[0]?.address || '' : '',
      to: Array.isArray(msg.envelope.to) ? msg.envelope.to.map(addr => addr.address).join(', ') : '',
      date: new Date(msg.envelope.date),
      body: msg.body ? msg.body.toString() : '',
      attachments: [], // Simplified - in real implementation, parse attachments
    }))
  }

  private async fetchUnreadMessages(imapClient: ImapClient, folder: string, limit: number): Promise<EmailMessage[]> {
    const messages = await imapClient.listMessages(folder, '1:*', ['uid', 'flags', 'envelope', 'body[]'])

    // Filter for unread messages (those without the \\Seen flag)
    const unreadMessages = messages.filter(msg => !msg.flags.includes('\\Seen'))

    // Sort by date descending and limit
    const sortedMessages = unreadMessages.sort((a, b) => {
      const dateA = new Date(a.envelope.date).getTime()
      const dateB = new Date(b.envelope.date).getTime()
      return dateB - dateA
    }).slice(0, limit)

    return sortedMessages.map(msg => ({
      id: msg.uid.toString(),
      subject: msg.envelope.subject || '',
      from: Array.isArray(msg.envelope.from) ? msg.envelope.from[0]?.address || '' : '',
      to: Array.isArray(msg.envelope.to) ? msg.envelope.to.map(addr => addr.address).join(', ') : '',
      date: new Date(msg.envelope.date),
      body: msg.body ? msg.body.toString() : '',
      attachments: [], // Simplified - in real implementation, parse attachments
    }))
  }

  private async searchMessages(imapClient: ImapClient, criteria: any, folder: string): Promise<EmailMessage[]> {
    // Basic search implementation - could be enhanced with more sophisticated search options
    const messages = await imapClient.listMessages(folder, '1:*', ['uid', 'flags', 'envelope', 'body[]'])
    
    // Apply basic filtering based on criteria
    let filteredMessages = messages
    
    if (criteria.from) {
      filteredMessages = filteredMessages.filter(msg => 
        Array.isArray(msg.envelope.from) && 
        msg.envelope.from.some(addr => addr.address.includes(criteria.from))
      )
    }
    
    if (criteria.subject) {
      filteredMessages = filteredMessages.filter(msg => 
        msg.envelope.subject && msg.envelope.subject.includes(criteria.subject)
      )
    }
    
    if (criteria.unread) {
      filteredMessages = filteredMessages.filter(msg => 
        !msg.flags.includes('\\Seen')
      )
    }

    return filteredMessages.map(msg => ({
      id: msg.uid.toString(),
      subject: msg.envelope.subject || '',
      from: Array.isArray(msg.envelope.from) ? msg.envelope.from[0]?.address || '' : '',
      to: Array.isArray(msg.envelope.to) ? msg.envelope.to.map(addr => addr.address).join(', ') : '',
      date: new Date(msg.envelope.date),
      body: msg.body ? msg.body.toString() : '',
      attachments: [], // Simplified - in real implementation, parse attachments
    }))
  }

  private async getMessage(imapClient: ImapClient, messageId: string): Promise<EmailMessage | null> {
    const messages = await imapClient.listMessages('INBOX', messageId, ['uid', 'flags', 'envelope', 'body[]'])
    
    if (messages.length === 0) {
      return null
    }

    const msg = messages[0]
    return {
      id: msg.uid.toString(),
      subject: msg.envelope.subject || '',
      from: Array.isArray(msg.envelope.from) ? msg.envelope.from[0]?.address || '' : '',
      to: Array.isArray(msg.envelope.to) ? msg.envelope.to.map(addr => addr.address).join(', ') : '',
      date: new Date(msg.envelope.date),
      body: msg.body ? msg.body.toString() : '',
      attachments: [], // Simplified - in real implementation, parse attachments
    }
  }

  private async deleteMessage(imapClient: ImapClient, messageId: string, folder: string): Promise<boolean> {
    try {
      await imapClient.addFlags(folder, messageId, ['\\Deleted'])
      await imapClient.expunge(folder)
      return true
    } catch {
      return false
    }
  }

  private async sendEmail(smtpClient: SMTPClient, email: SendEmailParams): Promise<boolean> {
    try {
      const message = {
        from: email.from || 'sender@example.com',
        to: Array.isArray(email.to) ? email.to.join(', ') : email.to,
        subject: email.subject,
        text: email.body,
        html: email.html,
      }

      await smtpClient.send(message)
      return true
    } catch (error) {
      console.error('Failed to send email:', error)
      throw error
    }
  }

  private async extractLinksFromMessages(imapClient: ImapClient, searchTerm: string, limit: number): Promise<string[]> {
    const messages = await this.fetchUnreadMessages(imapClient, 'INBOX', limit)
    const links: string[] = []

    for (const message of messages) {
      // Extract links from email body using regex
      const linkRegex = /https?:\/\/[^\s<>"{}|\\^`\[\]]+/gi
      const foundLinks = message.body.match(linkRegex) || []
      links.push(...foundLinks)
    }

    return links
  }

  private getCapabilities(): ConnectorCapabilities {
    return {
      canAuthenticate: true,
      canScrape: false,
      canAutomate: false,
      canUpload: false,
      canDownload: false,
      canStream: false,
      canWebhook: false,
      canOAuth: false,
      requiresCaptcha: false,
      requiresEmail: true,
      requiresPhone: false,
    }
  }

  private createEmptyUsage(): ConnectionUsage {
    return {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      rateLimitHits: 0,
      totalDataTransferred: 0,
      averageResponseTime: 0,
    }
  }

  async markAsRead(connectionId: string, messageId: string): Promise<boolean> {
    const clients = this.clients.get(connectionId)
    if (!clients) return false

    try {
      await clients.imap.addFlags('INBOX', messageId, ['\\Seen'])
      return true
    } catch {
      return false
    }
  }

  async getFolders(connectionId: string): Promise<string[]> {
    const clients = this.clients.get(connectionId)
    if (!clients) return []

    try {
      const mailboxes = await clients.imap.listMailboxes()
      return mailboxes.folders.map(folder => folder.path)
    } catch {
      return []
    }
  }
}