// REST API Adapter for Universal Connector
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios'
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

export class RestApiAdapter implements ConnectionAdapter {
  type = ConnectionMethodType.REST_API
  private clients: Map<string, AxiosInstance> = new Map()
  private usage: Map<string, ConnectionUsage> = new Map()

  async connect(config: ConnectionConfig): Promise<ServiceConnection> {
    const connectionId = `rest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    const axiosConfig: AxiosRequestConfig = {
      baseURL: config.endpoint,
      timeout: config.timeout || 30000,
      headers: this.buildHeaders(config),
    }

    if (config.proxy) {
      axiosConfig.proxy = {
        host: new URL(config.proxy.url).hostname,
        port: parseInt(new URL(config.proxy.url).port) || 80,
        auth: config.proxy.username
          ? { username: config.proxy.username, password: config.proxy.password || '' }
          : undefined,
      }
    }

    const client = axios.create(axiosConfig)
    this.clients.set(connectionId, client)
    this.usage.set(connectionId, this.createEmptyUsage())

    const connection: ServiceConnection = {
      id: connectionId,
      serviceId: config.endpoint || 'unknown',
      method: ConnectionMethodType.REST_API,
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

  async disconnect(connectionId: string): Promise<boolean> {
    this.clients.delete(connectionId)
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
        error: 'Client not found',
        duration: 0,
        retryCount: 0,
        method: this.type,
      }
    }

    const { method = 'GET', path = '', data, headers, query } = params

    try {
      usage.totalRequests++

      const response = await client.request<T>({
        method,
        url: path,
        data,
        headers,
        params: query,
      })

      const duration = Date.now() - startTime
      usage.successfulRequests++
      usage.averageResponseTime =
        (usage.averageResponseTime * (usage.successfulRequests - 1) + duration) /
        usage.successfulRequests
      usage.lastRequestTime = new Date()

      return {
        success: true,
        data: response.data,
        statusCode: response.status,
        headers: response.headers as Record<string, string>,
        duration,
        retryCount: 0,
        method: this.type,
      }
    } catch (error: any) {
      const duration = Date.now() - startTime
      usage.failedRequests++

      if (error.response?.status === 429) {
        usage.rateLimitHits++
      }

      return {
        success: false,
        error: error.message,
        statusCode: error.response?.status,
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
      await client.get('/', { timeout: 5000 })
      return true
    } catch (error: any) {
      return error.response?.status < 500
    }
  }

  async refreshCredentials(connection: ServiceConnection): Promise<ConnectionCredentials> {
    return connection.credentials || {}
  }

  private buildHeaders(config: ConnectionConfig): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...config.headers,
    }

    if (config.credentials) {
      if (config.credentials.bearerToken) {
        headers['Authorization'] = `Bearer ${config.credentials.bearerToken}`
      } else if (config.credentials.apiKey) {
        headers['X-API-Key'] = config.credentials.apiKey
      } else if (config.credentials.accessToken) {
        headers['Authorization'] = `Bearer ${config.credentials.accessToken}`
      }

      if (config.credentials.customHeaders) {
        Object.assign(headers, config.credentials.customHeaders)
      }
    }

    return headers
  }

  private getCapabilities(): ConnectorCapabilities {
    return {
      canAuthenticate: true,
      canScrape: false,
      canAutomate: false,
      canUpload: true,
      canDownload: true,
      canStream: false,
      canWebhook: true,
      canOAuth: true,
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
}
