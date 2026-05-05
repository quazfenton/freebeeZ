// Universal Service Connector
// Central hub for connecting to any service via multiple methods
import {
  ConnectionMethodType,
  ConnectionConfig,
  ConnectionAdapter,
  ServiceConnection,
  ConnectionResult,
  DiscoveredService,
  AggregationSource,
  ConnectorCapabilities,
} from './types'
import { RestApiAdapter } from './adapters/rest-adapter'
import { ScrapingAdapter } from './adapters/scraping-adapter'
import { BrowserAutomationAdapter } from './adapters/browser-adapter'

export * from './types'
export * from './adapters'

interface ConnectionAttempt {
  method: ConnectionMethodType
  success: boolean
  error?: string
  duration: number
}

interface MultiMethodResult<T> {
  success: boolean
  data?: T
  method?: ConnectionMethodType
  attempts: ConnectionAttempt[]
  totalDuration: number
}

export class UniversalConnector {
  private adapters: Map<ConnectionMethodType, ConnectionAdapter> = new Map()
  private connections: Map<string, ServiceConnection> = new Map()
  private serviceConnections: Map<string, string[]> = new Map() // serviceId -> connectionIds

  constructor() {
    this.initializeAdapters()
  }

  private initializeAdapters(): void {
    this.adapters.set(ConnectionMethodType.REST_API, new RestApiAdapter())
    this.adapters.set(ConnectionMethodType.SCRAPING, new ScrapingAdapter())
    this.adapters.set(ConnectionMethodType.BROWSER_AUTOMATION, new BrowserAutomationAdapter())
  }

  registerAdapter(type: ConnectionMethodType, adapter: ConnectionAdapter): void {
    this.adapters.set(type, adapter)
  }

  async connect(
    serviceId: string,
    config: ConnectionConfig
  ): Promise<ServiceConnection> {
    const adapter = this.adapters.get(config.method)
    if (!adapter) {
      throw new Error(`No adapter available for method: ${config.method}`)
    }

    const connection = await adapter.connect(config)
    connection.serviceId = serviceId
    this.connections.set(connection.id, connection)

    const serviceConns = this.serviceConnections.get(serviceId) || []
    serviceConns.push(connection.id)
    this.serviceConnections.set(serviceId, serviceConns)

    return connection
  }

  async disconnect(connectionId: string): Promise<boolean> {
    const connection = this.connections.get(connectionId)
    if (!connection) return false

    const adapter = this.adapters.get(connection.method)
    if (!adapter) return false

    const result = await adapter.disconnect(connectionId)
    if (result) {
      this.connections.delete(connectionId)

      const serviceConns = this.serviceConnections.get(connection.serviceId) || []
      const filtered = serviceConns.filter((id) => id !== connectionId)
      if (filtered.length > 0) {
        this.serviceConnections.set(connection.serviceId, filtered)
      } else {
        this.serviceConnections.delete(connection.serviceId)
      }
    }

    return result
  }

  async disconnectService(serviceId: string): Promise<boolean> {
    const connectionIds = this.serviceConnections.get(serviceId) || []
    const results = await Promise.all(connectionIds.map((id) => this.disconnect(id)))
    return results.every((r) => r)
  }

  async execute<T>(
    connectionId: string,
    action: string,
    params: Record<string, any> = {}
  ): Promise<ConnectionResult<T>> {
    const connection = this.connections.get(connectionId)
    if (!connection) {
      return {
        success: false,
        error: 'Connection not found',
        duration: 0,
        retryCount: 0,
        method: ConnectionMethodType.REST_API,
      }
    }

    const adapter = this.adapters.get(connection.method)
    if (!adapter) {
      return {
        success: false,
        error: `No adapter for method: ${connection.method}`,
        duration: 0,
        retryCount: 0,
        method: connection.method,
      }
    }

    connection.lastUsed = new Date()
    return adapter.execute<T>(connection, action, params)
  }

  async executeWithFallback<T>(
    serviceId: string,
    action: string,
    params: Record<string, any>,
    methodPriority: ConnectionMethodType[] = [
      ConnectionMethodType.REST_API,
      ConnectionMethodType.SCRAPING,
      ConnectionMethodType.BROWSER_AUTOMATION,
    ]
  ): Promise<MultiMethodResult<T>> {
    const startTime = Date.now()
    const attempts: ConnectionAttempt[] = []
    const connectionIds = this.serviceConnections.get(serviceId) || []

    for (const method of methodPriority) {
      const connectionId = connectionIds.find((id) => {
        const conn = this.connections.get(id)
        return conn && conn.method === method && conn.status === 'connected'
      })

      if (!connectionId) {
        attempts.push({
          method,
          success: false,
          error: 'No connection available',
          duration: 0,
        })
        continue
      }

      const attemptStart = Date.now()
      const result = await this.execute<T>(connectionId, action, params)
      const attemptDuration = Date.now() - attemptStart

      attempts.push({
        method,
        success: result.success,
        error: result.error,
        duration: attemptDuration,
      })

      if (result.success) {
        return {
          success: true,
          data: result.data,
          method,
          attempts,
          totalDuration: Date.now() - startTime,
        }
      }
    }

    return {
      success: false,
      attempts,
      totalDuration: Date.now() - startTime,
    }
  }

  async autoConnect(
    service: DiscoveredService,
    credentials?: Record<string, any>
  ): Promise<ServiceConnection[]> {
    const connections: ServiceConnection[] = []

    for (const method of service.connectionMethods) {
      try {
        const config = this.buildConfigForMethod(service, method, credentials)
        const connection = await this.connect(service.id, config)
        connections.push(connection)
      } catch (error) {
        console.warn(`Failed to connect to ${service.name} via ${method}:`, error)
      }
    }

    return connections
  }

  private buildConfigForMethod(
    service: DiscoveredService,
    method: ConnectionMethodType,
    credentials?: Record<string, any>
  ): ConnectionConfig {
    const baseConfig: ConnectionConfig = {
      method,
      endpoint: service.url,
      timeout: 30000,
      retries: 3,
    }

    if (credentials) {
      baseConfig.credentials = {
        apiKey: credentials.apiKey,
        accessToken: credentials.accessToken,
        username: credentials.username,
        password: credentials.password,
      }
    }

    switch (method) {
      case ConnectionMethodType.REST_API:
        return {
          ...baseConfig,
          endpoint: service.apiDocsUrl || service.url,
          headers: {
            Accept: 'application/json',
          },
        }

      case ConnectionMethodType.SCRAPING:
        return {
          ...baseConfig,
          endpoint: service.url,
        }

      case ConnectionMethodType.BROWSER_AUTOMATION:
        return {
          ...baseConfig,
          endpoint: service.signupUrl || service.url,
        }

      default:
        return baseConfig
    }
  }

  getConnection(connectionId: string): ServiceConnection | undefined {
    return this.connections.get(connectionId)
  }

  getServiceConnections(serviceId: string): ServiceConnection[] {
    const connectionIds = this.serviceConnections.get(serviceId) || []
    return connectionIds
      .map((id) => this.connections.get(id))
      .filter((c): c is ServiceConnection => c !== undefined)
  }

  getAllConnections(): ServiceConnection[] {
    return Array.from(this.connections.values())
  }

  getAvailableMethods(): ConnectionMethodType[] {
    return Array.from(this.adapters.keys())
  }

  getAdapterCapabilities(method: ConnectionMethodType): ConnectorCapabilities | undefined {
    const adapter = this.adapters.get(method)
    if (!adapter) return undefined

    return {
      canAuthenticate: true,
      canScrape: method === ConnectionMethodType.SCRAPING || method === ConnectionMethodType.BROWSER_AUTOMATION,
      canAutomate: method === ConnectionMethodType.BROWSER_AUTOMATION,
      canUpload: method !== ConnectionMethodType.SCRAPING,
      canDownload: true,
      canStream: method === ConnectionMethodType.WEBSOCKET,
      canWebhook: method === ConnectionMethodType.REST_API || method === ConnectionMethodType.WEBHOOK,
      canOAuth: method === ConnectionMethodType.REST_API || method === ConnectionMethodType.OAUTH,
      requiresCaptcha: method === ConnectionMethodType.BROWSER_AUTOMATION,
      requiresEmail: method === ConnectionMethodType.BROWSER_AUTOMATION,
      requiresPhone: false,
    }
  }

  async healthCheckAll(): Promise<Map<string, boolean>> {
    const results = new Map<string, boolean>()

    for (const [id, connection] of this.connections) {
      const adapter = this.adapters.get(connection.method)
      if (adapter) {
        const healthy = await adapter.healthCheck(connection)
        results.set(id, healthy)

        connection.status = healthy ? 'connected' : 'error'
      }
    }

    return results
  }

  async cleanup(): Promise<void> {
    const disconnectPromises = Array.from(this.connections.keys()).map((id) =>
      this.disconnect(id)
    )
    await Promise.all(disconnectPromises)
  }

  getStatistics(): {
    totalConnections: number
    byMethod: Record<string, number>
    byStatus: Record<string, number>
    byService: Record<string, number>
  } {
    const stats = {
      totalConnections: this.connections.size,
      byMethod: {} as Record<string, number>,
      byStatus: {} as Record<string, number>,
      byService: {} as Record<string, number>,
    }

    for (const connection of this.connections.values()) {
      stats.byMethod[connection.method] = (stats.byMethod[connection.method] || 0) + 1
      stats.byStatus[connection.status] = (stats.byStatus[connection.status] || 0) + 1
      stats.byService[connection.serviceId] = (stats.byService[connection.serviceId] || 0) + 1
    }

    return stats
  }
}
