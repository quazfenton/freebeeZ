// Browser Automation Adapter for Universal Connector
// Wraps existing BrowserAutomationEngine for universal connector interface
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
import { BrowserAutomationEngine, AutomationTask, AutomationStep, BrowserProfile } from '../../browser-automation'

export interface BrowserActionParams {
  action: 'navigate' | 'click' | 'type' | 'wait' | 'extract' | 'screenshot' | 'custom'
  url?: string
  selector?: string
  value?: string
  timeout?: number
  waitFor?: string
  profile?: BrowserProfile
  steps?: AutomationStep[]
}

export class BrowserAutomationAdapter implements ConnectionAdapter {
  type = ConnectionMethodType.BROWSER_AUTOMATION
  private engines: Map<string, BrowserAutomationEngine> = new Map()
  private usage: Map<string, ConnectionUsage> = new Map()

  async connect(config: ConnectionConfig): Promise<ServiceConnection> {
    const connectionId = `browser_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    const engine = new BrowserAutomationEngine()
    await engine.initialize(config.proxy ? { url: config.proxy.url, ...config.proxy } : undefined)

    this.engines.set(connectionId, engine)
    this.usage.set(connectionId, this.createEmptyUsage())

    const connection: ServiceConnection = {
      id: connectionId,
      serviceId: 'browser-automation',
      method: ConnectionMethodType.BROWSER_AUTOMATION,
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
    const engine = this.engines.get(connectionId)
    if (engine) {
      await engine.cleanup()
      this.engines.delete(connectionId)
    }
    this.usage.delete(connectionId)
    return true
  }

  async execute<T>(
    connection: ServiceConnection,
    action: string,
    params: Record<string, any>
  ): Promise<ConnectionResult<T>> {
    const startTime = Date.now()
    const engine = this.engines.get(connection.id)
    const usage = this.usage.get(connection.id)!

    if (!engine) {
      return {
        success: false,
        error: 'Browser engine not found',
        duration: 0,
        retryCount: 0,
        method: this.type,
      }
    }

    try {
      usage.totalRequests++

      const browserParams = params as BrowserActionParams

      const task: AutomationTask = {
        id: `task_${Date.now()}`,
        name: action,
        url: browserParams.url || '',
        steps: browserParams.steps || this.buildSteps(browserParams),
        profile: browserParams.profile,
        retries: connection.config.retries || 3,
        timeout: browserParams.timeout || connection.config.timeout || 60000,
      }

      const result = await engine._executeTaskInternal(task)
      const duration = Date.now() - startTime

      if (result.success) {
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
      } else {
        usage.failedRequests++
        return {
          success: false,
          error: result.error,
          duration,
          retryCount: 0,
          method: this.type,
        }
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
    return this.engines.has(connection.id)
  }

  private buildSteps(params: BrowserActionParams): AutomationStep[] {
    const steps: AutomationStep[] = []

    if (params.url) {
      steps.push({
        type: 'navigate',
        value: params.url,
        timeout: params.timeout,
      })
    }

    switch (params.action) {
      case 'click':
        if (params.selector) {
          steps.push({
            type: 'click',
            selector: params.selector,
            timeout: params.timeout,
          })
        }
        break

      case 'type':
        if (params.selector && params.value) {
          steps.push({
            type: 'type',
            selector: params.selector,
            value: params.value,
            timeout: params.timeout,
          })
        }
        break

      case 'wait':
        steps.push({
          type: 'wait',
          selector: params.waitFor,
          value: params.timeout?.toString(),
          timeout: params.timeout,
        })
        break

      case 'extract':
        if (params.selector) {
          steps.push({
            type: 'extract',
            selector: params.selector,
          })
        }
        break

      case 'screenshot':
        steps.push({
          type: 'screenshot',
        })
        break
    }

    return steps
  }

  private getCapabilities(): ConnectorCapabilities {
    return {
      canAuthenticate: true,
      canScrape: true,
      canAutomate: true,
      canUpload: true,
      canDownload: true,
      canStream: false,
      canWebhook: false,
      canOAuth: true,
      requiresCaptcha: true,
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
}
