import type { ServiceIntegration } from "../service-integrations"

export enum AutomationType {
  SERVICE_CONNECTOR = "service_connector",
  SERVICE_ROTATION = "service_rotation",
  LIMIT_MONITOR = "limit_monitor",
  CREDENTIAL_MANAGER = "credential_manager",
  CUSTOM = "custom",
}

export enum TriggerType {
  SCHEDULE = "schedule",
  EVENT = "event",
  MANUAL = "manual",
  LIMIT = "limit",
}

export enum ActionType {
  CONNECT = "connect",
  ROTATE = "rotate",
  MONITOR = "monitor",
  BACKUP = "backup",
  CUSTOM = "custom",
}

export interface ScheduleConfig {
  type: "hourly" | "daily" | "weekly" | "monthly" | "custom"
  customCron?: string
  startTime?: Date
}

export interface EventConfig {
  eventType: string
  source: string
  conditions?: Record<string, any>
}

export interface LimitConfig {
  serviceId: string
  limitType: string
  threshold: number
}

export interface TriggerConfig {
  type: TriggerType
  schedule?: ScheduleConfig
  event?: EventConfig
  limit?: LimitConfig
}

export interface ActionConfig {
  type: ActionType
  params: Record<string, any>
}

export interface AutomationConfig {
  id: string
  name: string
  description: string
  type: AutomationType
  services: string[] // Service IDs
  trigger: TriggerConfig
  actions: ActionConfig[]
  isActive: boolean
  lastRun?: Date
  nextRun?: Date
  createdAt: Date
  updatedAt: Date
}

export interface AutomationResult {
  success: boolean
  message: string
  data?: any
  error?: Error
  timestamp: Date
}

export interface AutomationHistory {
  id: string
  automationId: string
  result: AutomationResult
  startTime: Date
  endTime: Date
  duration: number // in milliseconds
}

export interface Automation {
  id: string
  name: string
  description: string
  type: AutomationType
  services: ServiceIntegration[]

  // Core methods
  start(): Promise<boolean>
  stop(): Promise<boolean>
  run(): Promise<AutomationResult>
  isRunning(): boolean

  // Configuration
  getConfig(): AutomationConfig
  updateConfig(config: Partial<AutomationConfig>): Promise<boolean>

  // History
  getHistory(limit?: number): Promise<AutomationHistory[]>
}

// Base class for automations
export abstract class BaseAutomation implements Automation {
  id: string
  name: string
  description: string
  type: AutomationType
  services: ServiceIntegration[]
  protected config: AutomationConfig
  protected running = false

  constructor(config: AutomationConfig, services: ServiceIntegration[]) {
    this.id = config.id
    this.name = config.name
    this.description = config.description
    this.type = config.type
    this.services = services
    this.config = config
    this.running = config.isActive
  }

  abstract run(): Promise<AutomationResult>

  async start(): Promise<boolean> {
    this.running = true
    this.config.isActive = true
    return true
  }

  async stop(): Promise<boolean> {
    this.running = false
    this.config.isActive = false
    return true
  }

  isRunning(): boolean {
    return this.running
  }

  getConfig(): AutomationConfig {
    return this.config
  }

  async updateConfig(config: Partial<AutomationConfig>): Promise<boolean> {
    this.config = {
      ...this.config,
      ...config,
      updatedAt: new Date(),
    }
    return true
  }

  async getHistory(limit = 10): Promise<AutomationHistory[]> {
    // This would be implemented to fetch from a database
    return []
  }
}
