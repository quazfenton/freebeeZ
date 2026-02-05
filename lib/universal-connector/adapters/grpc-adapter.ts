// gRPC Adapter for Universal Connector
// High-performance service communication
import * as grpc from '@grpc/grpc-js'
import * as protoLoader from '@grpc/proto-loader'
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

export interface GrpcConnectionConfig extends ConnectionConfig {
  protoPath: string
  serviceName: string
  methodName: string
  ssl?: boolean
  credentials?: grpc.ChannelCredentials
}

export interface GrpcCallOptions {
  deadline?: Date
  metadata?: grpc.Metadata
  propagate_flags?: number
}

export class GrpcAdapter implements ConnectionAdapter {
  type = ConnectionMethodType.GRPC
  private clients: Map<string, grpc.Client> = new Map()
  private usage: Map<string, ConnectionUsage> = new Map()
  private configs: Map<string, GrpcConnectionConfig> = new Map()
  private loadedProtos: Map<string, any> = new Map()

  async connect(config: GrpcConnectionConfig): Promise<ServiceConnection> {
    const connectionId = `grpc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    this.configs.set(connectionId, config)
    this.usage.set(connectionId, this.createEmptyUsage())

    try {
      // Load the proto file
      let packageDefinition = this.loadedProtos.get(config.protoPath)
      if (!packageDefinition) {
        packageDefinition = await protoLoader.load(config.protoPath, {
          keepCase: true,
          longs: String,
          enums: String,
          defaults: true,
          oneofs: true
        })
        this.loadedProtos.set(config.protoPath, packageDefinition)
      }

      const protoDescriptor = grpc.loadPackageDefinition(packageDefinition)
      const serviceConstructor = protoDescriptor[config.serviceName]
      
      if (!serviceConstructor) {
        throw new Error(`Service ${config.serviceName} not found in proto file`)
      }

      // Create credentials
      const credentials = config.ssl 
        ? grpc.credentials.createSsl()
        : grpc.credentials.createInsecure()

      // Create the client
      const client = new serviceConstructor(
        config.endpoint!,
        credentials,
        {
          'grpc.keepalive_time_ms': 30000,
          'grpc.http2.min_time_between_pings_ms': 30000,
          'grpc.keepalive_timeout_ms': 10000,
        }
      )

      this.clients.set(connectionId, client)

      return {
        id: connectionId,
        serviceId: config.serviceName,
        method: ConnectionMethodType.GRPC,
        status: 'connected',
        config,
        credentials: config.credentials,
        capabilities: this.getCapabilities(),
        usage: this.usage.get(connectionId)!,
        healthCheck: () => this.healthCheck({ id: connectionId } as ServiceConnection),
        createdAt: new Date(),
      }
    } catch (error: any) {
      throw new Error(`Failed to connect via gRPC: ${error.message}`)
    }
  }

  async disconnect(connectionId: string): Promise<boolean> {
    const client = this.clients.get(connectionId)
    if (client) {
      client.close()
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
    const client = this.clients.get(connection.id)
    const usage = this.usage.get(connection.id)!

    if (!client) {
      return {
        success: false,
        error: 'gRPC client not connected',
        duration: 0,
        retryCount: 0,
        method: this.type,
      }
    }

    usage.totalRequests++

    try {
      // Extract call options
      const { metadata, deadline, ...callParams } = params
      
      // Prepare gRPC call
      const config = this.configs.get(connection.id)!
      const methodName = action || config.methodName
      
      // Perform the gRPC call
      return new Promise((resolve, reject) => {
        const callMetadata = metadata ? grpc.Metadata.fromJSON(metadata) : new grpc.Metadata()
        
        const callDeadline = deadline ? new Date(deadline) : Date.now() + 30000 // Default 30s timeout
        
        // Dynamically call the method on the client
        const call = (client as any)[methodName](callParams, callMetadata, { deadline: callDeadline })
        
        call.on('data', (data: any) => {
          const duration = Date.now() - startTime
          usage.successfulRequests++
          usage.averageResponseTime =
            (usage.averageResponseTime * (usage.successfulRequests - 1) + duration) /
            usage.successfulRequests
          usage.lastRequestTime = new Date()
          
          resolve({
            success: true,
            data: data as T,
            duration,
            retryCount: 0,
            method: this.type,
          })
        })
        
        call.on('error', (error: grpc.ServiceError) => {
          const duration = Date.now() - startTime
          usage.failedRequests++
          
          if (error.code === grpc.status.UNAVAILABLE) {
            usage.rateLimitHits++ // Treating unavailable as rate limit for tracking purposes
          }
          
          resolve({
            success: false,
            error: error.details || error.message,
            statusCode: error.code,
            duration,
            retryCount: 0,
            method: this.type,
          })
        })
        
        call.on('end', () => {
          // Stream ended
        })
      })
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
    const client = this.clients.get(connection.id)
    if (!client) return false

    try {
      // Try to get the channel state
      const state = client.getChannel().getConnectivityState(true)
      return state === grpc.connectivityState.READY || 
             state === grpc.connectivityState.IDLE || 
             state === grpc.connectivityState.CONNECTING
    } catch {
      return false
    }
  }

  async refreshCredentials(connection: ServiceConnection): Promise<ConnectionCredentials> {
    const config = this.configs.get(connection.id)
    return {
      apiKey: config?.credentials ? '[has-credentials]' : undefined,
    }
  }

  private getCapabilities(): ConnectorCapabilities {
    return {
      canAuthenticate: true,
      canScrape: false,
      canAutomate: false,
      canUpload: true,
      canDownload: true,
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

  /**
   * Perform a unary gRPC call
   */
  async unaryCall<T>(
    connectionId: string,
    methodName: string,
    request: any,
    options?: GrpcCallOptions
  ): Promise<ConnectionResult<T>> {
    const client = this.clients.get(connectionId)
    if (!client) {
      return {
        success: false,
        error: 'gRPC client not connected',
        duration: 0,
        retryCount: 0,
        method: this.type,
      }
    }

    const startTime = Date.now()
    const usage = this.usage.get(connectionId)!

    return new Promise((resolve) => {
      const metadata = options?.metadata || new grpc.Metadata()
      const deadline = options?.deadline || new Date(Date.now() + 30000) // 30s default

      ;(client as any)[methodName](request, metadata, { deadline }, (error: grpc.ServiceError | null, response: any) => {
        const duration = Date.now() - startTime
        usage.totalRequests++

        if (error) {
          usage.failedRequests++
          if (error.code === grpc.status.UNAVAILABLE) {
            usage.rateLimitHits++
          }
          
          resolve({
            success: false,
            error: error.details || error.message,
            statusCode: error.code,
            duration,
            retryCount: 0,
            method: this.type,
          })
        } else {
          usage.successfulRequests++
          usage.averageResponseTime =
            (usage.averageResponseTime * (usage.successfulRequests - 1) + duration) /
            usage.successfulRequests
          usage.lastRequestTime = new Date()
          
          resolve({
            success: true,
            data: response as T,
            duration,
            retryCount: 0,
            method: this.type,
          })
        }
      })
    })
  }

  /**
   * Perform a streaming gRPC call
   */
  async streamCall(
    connectionId: string,
    methodName: string,
    request: any,
    onData: (data: any) => void,
    onError?: (error: grpc.ServiceError) => void,
    onEnd?: () => void,
    options?: GrpcCallOptions
  ): Promise<void> {
    const client = this.clients.get(connectionId)
    if (!client) {
      throw new Error('gRPC client not connected')
    }

    const metadata = options?.metadata || new grpc.Metadata()
    const deadline = options?.deadline || new Date(Date.now() + 30000) // 30s default

    const call = (client as any)[methodName](request, metadata, { deadline })

    call.on('data', onData)
    if (onError) call.on('error', onError)
    if (onEnd) call.on('end', onEnd)
  }
}