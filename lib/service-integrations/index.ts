// Service Integration Framework

export interface ServiceCredentials {
  apiKey?: string
  username?: string
  password?: string
  token?: string
  refreshToken?: string
  expiresAt?: Date
  [key: string]: any
}

export interface ServiceLimits {
  dailyRequests?: number
  monthlyRequests?: number
  storageLimit?: number
  bandwidthLimit?: number
  timeLimit?: number
  [key: string]: any
}

export interface ServiceUsage {
  dailyRequestsUsed?: number
  monthlyRequestsUsed?: number
  storageUsed?: number
  bandwidthUsed?: number
  timeUsed?: number
  lastUpdated?: Date
  [key: string]: any
}

export interface ServiceConfig {
  id: string
  name: string
  description: string
  category: ServiceCategory
  credentials: ServiceCredentials
  limits: ServiceLimits
  usage: ServiceUsage
  isActive: boolean
  lastUsed?: Date
  settings: Record<string, any>
}

export enum ServiceCategory {
  COMMUNICATION = "communication",
  WEB_INFRASTRUCTURE = "web_infrastructure",
  COMPUTING_STORAGE = "computing_storage",
  AI_ML = "ai_ml",
  DEVELOPER_TOOLS = "developer_tools",
  SECURITY = "security",
  UTILITIES = "utilities",
}

export interface ServiceIntegration {
  id: string
  name: string
  description: string
  category: ServiceCategory

  // Core methods
  connect(credentials: ServiceCredentials): Promise<boolean>
  disconnect(): Promise<boolean>
  isConnected(): boolean

  // Service-specific methods
  executeAction(action: string, params: Record<string, any>): Promise<any>
  getUsage(): Promise<ServiceUsage>
  getLimits(): Promise<ServiceLimits>

  // Credential management
  updateCredentials(credentials: Partial<ServiceCredentials>): Promise<boolean>
  rotateCredentials(): Promise<ServiceCredentials>
}

// Base class for service integrations
export abstract class BaseServiceIntegration implements ServiceIntegration {
  id: string
  name: string
  description: string
  category: ServiceCategory
  protected config: ServiceConfig
  protected connected = false

  constructor(config: ServiceConfig) {
    this.id = config.id
    this.name = config.name
    this.description = config.description
    this.category = config.category
    this.config = config
    this.connected = config.isActive
  }

  abstract connect(credentials: ServiceCredentials): Promise<boolean>
  abstract disconnect(): Promise<boolean>
  abstract executeAction(action: string, params: Record<string, any>): Promise<any>

  isConnected(): boolean {
    return this.connected
  }

  async getUsage(): Promise<ServiceUsage> {
    return this.config.usage
  }

  async getLimits(): Promise<ServiceLimits> {
    return this.config.limits
  }

  // Add getters for config properties to make them accessible
  get isActive(): boolean {
    return this.config.isActive;
  }

  get usage(): ServiceUsage {
    return this.config.usage;
  }

  get limits(): ServiceLimits {
    return this.config.limits;
  }

  get credentials(): ServiceCredentials {
    return this.config.credentials;
  }

  async updateCredentials(credentials: Partial<ServiceCredentials>): Promise<boolean> {
    this.config.credentials = {
      ...this.config.credentials,
      ...credentials,
    }
    return true
  }

  abstract rotateCredentials(): Promise<ServiceCredentials>
}
