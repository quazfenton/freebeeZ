// WebSocket Adapter for Universal Connector
// Real-time bidirectional communication with services
import { io, Socket } from 'socket.io-client'
import WebSocket from 'ws'
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

export type WebSocketType = 'native' | 'socket.io'

export interface WebSocketMessage {
  id: string
  event: string
  data: any
  timestamp: Date
}

export interface WebSocketConnectionConfig extends ConnectionConfig {
  wsType?: WebSocketType
  autoReconnect?: boolean
  reconnectAttempts?: number
  reconnectDelay?: number
  heartbeatInterval?: number
  messageQueueSize?: number
}

interface PendingMessage {
  id: string
  event: string
  data: any
  resolve: (result: ConnectionResult<any>) => void
  reject: (error: Error) => void
  timeout: NodeJS.Timeout
}

export class WebSocketAdapter implements ConnectionAdapter {
  type = ConnectionMethodType.WEBSOCKET
  private sockets: Map<string, Socket | WebSocket> = new Map()
  private socketTypes: Map<string, WebSocketType> = new Map()
  private usage: Map<string, ConnectionUsage> = new Map()
  private messageQueues: Map<string, WebSocketMessage[]> = new Map()
  private pendingMessages: Map<string, PendingMessage> = new Map()
  private messageHandlers: Map<string, Map<string, ((data: any) => void)[]>> = new Map()
  private reconnectAttempts: Map<string, number> = new Map()
  private heartbeatTimers: Map<string, NodeJS.Timeout> = new Map()
  private configs: Map<string, WebSocketConnectionConfig> = new Map()

  async connect(config: WebSocketConnectionConfig): Promise<ServiceConnection> {
    const connectionId = `ws_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const wsType = config.wsType || 'native'

    this.configs.set(connectionId, config)
    this.usage.set(connectionId, this.createEmptyUsage())
    this.messageQueues.set(connectionId, [])
    this.messageHandlers.set(connectionId, new Map())
    this.socketTypes.set(connectionId, wsType)
    this.reconnectAttempts.set(connectionId, 0)

    if (wsType === 'socket.io') {
      await this.connectSocketIO(connectionId, config)
    } else {
      await this.connectNativeWS(connectionId, config)
    }

    const connection: ServiceConnection = {
      id: connectionId,
      serviceId: config.endpoint || 'unknown',
      method: ConnectionMethodType.WEBSOCKET,
      status: 'connected',
      config,
      credentials: config.credentials,
      capabilities: this.getCapabilities(),
      usage: this.usage.get(connectionId)!,
      healthCheck: () => this.healthCheck({ id: connectionId } as ServiceConnection),
      createdAt: new Date(),
    }

    return connection
  }

  private async connectSocketIO(
    connectionId: string,
    config: WebSocketConnectionConfig
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const socketOptions: any = {
        autoConnect: true,
        reconnection: config.autoReconnect !== false,
        reconnectionAttempts: config.reconnectAttempts || 5,
        reconnectionDelay: config.reconnectDelay || 1000,
        timeout: config.timeout || 20000,
      }

      if (config.credentials?.bearerToken) {
        socketOptions.auth = { token: config.credentials.bearerToken }
      }

      const socket = io(config.endpoint!, socketOptions)

      socket.on('connect', () => {
        this.reconnectAttempts.set(connectionId, 0)
        this.startHeartbeat(connectionId, config.heartbeatInterval)
        this.flushMessageQueue(connectionId)
        resolve()
      })

      socket.on('disconnect', (reason) => {
        this.stopHeartbeat(connectionId)
        if (reason === 'io server disconnect') {
          socket.connect()
        }
      })

      socket.on('connect_error', (error) => {
        const attempts = this.reconnectAttempts.get(connectionId) || 0
        if (attempts >= (config.reconnectAttempts || 5)) {
          reject(new Error(`WebSocket connection failed: ${error.message}`))
        }
        this.reconnectAttempts.set(connectionId, attempts + 1)
      })

      socket.onAny((event, ...args) => {
        this.handleIncomingMessage(connectionId, event, args[0])
      })

      this.sockets.set(connectionId, socket)
    })
  }

  private async connectNativeWS(
    connectionId: string,
    config: WebSocketConnectionConfig
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const wsUrl = config.endpoint!.replace(/^http/, 'ws')
      const headers: Record<string, string> = {}

      if (config.credentials?.bearerToken) {
        headers['Authorization'] = `Bearer ${config.credentials.bearerToken}`
      }
      if (config.credentials?.apiKey) {
        headers['X-API-Key'] = config.credentials.apiKey
      }

      const socket = new WebSocket(wsUrl, { headers })

      socket.on('open', () => {
        this.reconnectAttempts.set(connectionId, 0)
        this.startHeartbeat(connectionId, config.heartbeatInterval)
        this.flushMessageQueue(connectionId)
        resolve()
      })

      socket.on('close', (code, reason) => {
        this.stopHeartbeat(connectionId)
        if (config.autoReconnect !== false) {
          this.attemptReconnect(connectionId, config)
        }
      })

      socket.on('error', (error) => {
        const attempts = this.reconnectAttempts.get(connectionId) || 0
        if (attempts >= (config.reconnectAttempts || 5)) {
          reject(error)
        }
      })

      socket.on('message', (data) => {
        try {
          const parsed = JSON.parse(data.toString())
          this.handleIncomingMessage(connectionId, parsed.event || 'message', parsed.data || parsed)
        } catch {
          this.handleIncomingMessage(connectionId, 'message', data.toString())
        }
      })

      this.sockets.set(connectionId, socket)
    })
  }

  async disconnect(connectionId: string): Promise<boolean> {
    const socket = this.sockets.get(connectionId)
    this.stopHeartbeat(connectionId)

    if (socket) {
      if ('disconnect' in socket) {
        (socket as Socket).disconnect()
      } else {
        (socket as WebSocket).close()
      }
    }

    this.sockets.delete(connectionId)
    this.socketTypes.delete(connectionId)
    this.usage.delete(connectionId)
    this.messageQueues.delete(connectionId)
    this.messageHandlers.delete(connectionId)
    this.configs.delete(connectionId)
    this.reconnectAttempts.delete(connectionId)

    for (const [msgId, pending] of this.pendingMessages) {
      if (msgId.startsWith(connectionId)) {
        clearTimeout(pending.timeout)
        pending.reject(new Error('Connection closed'))
        this.pendingMessages.delete(msgId)
      }
    }

    return true
  }

  async execute<T>(
    connection: ServiceConnection,
    action: string,
    params: Record<string, any>
  ): Promise<ConnectionResult<T>> {
    const startTime = Date.now()
    const socket = this.sockets.get(connection.id)
    const usage = this.usage.get(connection.id)!

    if (!socket) {
      return {
        success: false,
        error: 'WebSocket not connected',
        duration: 0,
        retryCount: 0,
        method: this.type,
      }
    }

    const { event = 'message', data, waitForResponse = false, responseEvent, timeout = 30000 } = params

    return new Promise((resolve) => {
      const messageId = `${connection.id}:${Date.now()}:${Math.random().toString(36).substr(2, 9)}`
      usage.totalRequests++

      const sendMessage = () => {
        const wsType = this.socketTypes.get(connection.id)
        const payload = { id: messageId, ...data }

        if (wsType === 'socket.io') {
          ;(socket as Socket).emit(event, payload)
        } else {
          ;(socket as WebSocket).send(JSON.stringify({ event, data: payload }))
        }
      }

      if (!this.isConnected(connection.id)) {
        this.queueMessage(connection.id, { id: messageId, event, data, timestamp: new Date() })
        if (!waitForResponse) {
          resolve({
            success: true,
            data: { queued: true } as T,
            duration: Date.now() - startTime,
            retryCount: 0,
            method: this.type,
          })
          return
        }
      } else {
        sendMessage()
      }

      if (!waitForResponse) {
        usage.successfulRequests++
        resolve({
          success: true,
          duration: Date.now() - startTime,
          retryCount: 0,
          method: this.type,
        })
        return
      }

      const timeoutHandle = setTimeout(() => {
        this.pendingMessages.delete(messageId)
        usage.failedRequests++
        resolve({
          success: false,
          error: 'Response timeout',
          duration: Date.now() - startTime,
          retryCount: 0,
          method: this.type,
        })
      }, timeout)

      this.pendingMessages.set(messageId, {
        id: messageId,
        event: responseEvent || `${event}:response`,
        data,
        resolve: (result) => {
          clearTimeout(timeoutHandle)
          this.pendingMessages.delete(messageId)
          usage.successfulRequests++
          resolve({
            ...result,
            duration: Date.now() - startTime,
          })
        },
        reject: (error) => {
          clearTimeout(timeoutHandle)
          this.pendingMessages.delete(messageId)
          usage.failedRequests++
          resolve({
            success: false,
            error: error.message,
            duration: Date.now() - startTime,
            retryCount: 0,
            method: this.type,
          })
        },
        timeout: timeoutHandle,
      })
    })
  }

  async healthCheck(connection: ServiceConnection): Promise<boolean> {
    return this.isConnected(connection.id)
  }

  async refreshCredentials(connection: ServiceConnection): Promise<ConnectionCredentials> {
    return connection.credentials || {}
  }

  subscribe(
    connectionId: string,
    event: string,
    handler: (data: any) => void
  ): () => void {
    const handlers = this.messageHandlers.get(connectionId)
    if (!handlers) {
      throw new Error('Connection not found')
    }

    if (!handlers.has(event)) {
      handlers.set(event, [])
    }

    handlers.get(event)!.push(handler)

    return () => {
      const eventHandlers = handlers.get(event)
      if (eventHandlers) {
        const index = eventHandlers.indexOf(handler)
        if (index > -1) {
          eventHandlers.splice(index, 1)
        }
      }
    }
  }

  private handleIncomingMessage(connectionId: string, event: string, data: any): void {
    for (const [msgId, pending] of this.pendingMessages) {
      if (
        msgId.startsWith(connectionId) &&
        (pending.event === event || (data?.id && msgId.endsWith(data.id)))
      ) {
        pending.resolve({
          success: true,
          data,
          retryCount: 0,
          method: this.type,
          duration: 0,
        })
        return
      }
    }

    const handlers = this.messageHandlers.get(connectionId)
    if (handlers) {
      const eventHandlers = handlers.get(event) || []
      const allHandlers = handlers.get('*') || []

      for (const handler of [...eventHandlers, ...allHandlers]) {
        try {
          handler(data)
        } catch (error) {
          console.error(`WebSocket handler error for ${event}:`, error)
        }
      }
    }

    const usage = this.usage.get(connectionId)
    if (usage) {
      usage.totalRequests++
      usage.successfulRequests++
    }
  }

  private isConnected(connectionId: string): boolean {
    const socket = this.sockets.get(connectionId)
    if (!socket) return false

    const wsType = this.socketTypes.get(connectionId)
    if (wsType === 'socket.io') {
      return (socket as Socket).connected
    } else {
      return (socket as WebSocket).readyState === WebSocket.OPEN
    }
  }

  private queueMessage(connectionId: string, message: WebSocketMessage): void {
    const queue = this.messageQueues.get(connectionId)
    const config = this.configs.get(connectionId)
    const maxSize = config?.messageQueueSize || 100

    if (queue) {
      if (queue.length >= maxSize) {
        queue.shift()
      }
      queue.push(message)
    }
  }

  private flushMessageQueue(connectionId: string): void {
    const queue = this.messageQueues.get(connectionId)
    const socket = this.sockets.get(connectionId)
    const wsType = this.socketTypes.get(connectionId)

    if (!queue || !socket || !this.isConnected(connectionId)) return

    while (queue.length > 0) {
      const message = queue.shift()!
      if (wsType === 'socket.io') {
        ;(socket as Socket).emit(message.event, message.data)
      } else {
        ;(socket as WebSocket).send(JSON.stringify({ event: message.event, data: message.data }))
      }
    }
  }

  private attemptReconnect(connectionId: string, config: WebSocketConnectionConfig): void {
    const attempts = this.reconnectAttempts.get(connectionId) || 0
    const maxAttempts = config.reconnectAttempts || 5

    if (attempts >= maxAttempts) {
      console.error(`WebSocket ${connectionId} max reconnection attempts reached`)
      return
    }

    const delay = (config.reconnectDelay || 1000) * Math.pow(2, attempts)
    this.reconnectAttempts.set(connectionId, attempts + 1)

    setTimeout(async () => {
      try {
        const wsType = this.socketTypes.get(connectionId)
        if (wsType === 'socket.io') {
          await this.connectSocketIO(connectionId, config)
        } else {
          await this.connectNativeWS(connectionId, config)
        }
      } catch (error) {
        console.error(`WebSocket ${connectionId} reconnection failed:`, error)
        this.attemptReconnect(connectionId, config)
      }
    }, delay)
  }

  private startHeartbeat(connectionId: string, interval?: number): void {
    const heartbeatInterval = interval || 30000
    const timer = setInterval(() => {
      const socket = this.sockets.get(connectionId)
      const wsType = this.socketTypes.get(connectionId)

      if (socket && this.isConnected(connectionId)) {
        if (wsType === 'socket.io') {
          ;(socket as Socket).emit('ping')
        } else {
          ;(socket as WebSocket).ping()
        }
      }
    }, heartbeatInterval)

    this.heartbeatTimers.set(connectionId, timer)
  }

  private stopHeartbeat(connectionId: string): void {
    const timer = this.heartbeatTimers.get(connectionId)
    if (timer) {
      clearInterval(timer)
      this.heartbeatTimers.delete(connectionId)
    }
  }

  private getCapabilities(): ConnectorCapabilities {
    return {
      canAuthenticate: true,
      canScrape: false,
      canAutomate: false,
      canUpload: false,
      canDownload: false,
      canStream: true,
      canWebhook: false,
      canOAuth: false,
      requiresCaptcha: false,
      requiresEmail: false,
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

  getSocket(connectionId: string): Socket | WebSocket | undefined {
    return this.sockets.get(connectionId)
  }

  getQueuedMessages(connectionId: string): WebSocketMessage[] {
    return this.messageQueues.get(connectionId) || []
  }
}
