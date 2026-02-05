// Real-time Event System for FreebeeZ
// Provides WebSocket-based real-time updates for automation status, notifications, and system events

export enum EventType {
  // Automation Events
  TASK_STARTED = 'task:started',
  TASK_PROGRESS = 'task:progress',
  TASK_COMPLETED = 'task:completed',
  TASK_FAILED = 'task:failed',
  TASK_CANCELLED = 'task:cancelled',

  // CAPTCHA Events
  CAPTCHA_DETECTED = 'captcha:detected',
  CAPTCHA_SOLVING = 'captcha:solving',
  CAPTCHA_SOLVED = 'captcha:solved',
  CAPTCHA_FAILED = 'captcha:failed',
  CAPTCHA_MANUAL_REQUIRED = 'captcha:manual_required',

  // Service Events
  SERVICE_CONNECTED = 'service:connected',
  SERVICE_DISCONNECTED = 'service:disconnected',
  SERVICE_ERROR = 'service:error',
  SERVICE_QUOTA_WARNING = 'service:quota_warning',
  SERVICE_QUOTA_EXCEEDED = 'service:quota_exceeded',

  // Registration Events
  REGISTRATION_STARTED = 'registration:started',
  REGISTRATION_STEP = 'registration:step',
  REGISTRATION_VERIFICATION = 'registration:verification',
  REGISTRATION_COMPLETED = 'registration:completed',
  REGISTRATION_FAILED = 'registration:failed',

  // Profile/Proxy Events
  PROFILE_ROTATED = 'profile:rotated',
  PROXY_ROTATED = 'proxy:rotated',
  PROXY_FAILED = 'proxy:failed',

  // System Events
  SYSTEM_HEALTH = 'system:health',
  SYSTEM_ERROR = 'system:error',
  SYSTEM_WARNING = 'system:warning',

  // Aggregation Events
  AGGREGATION_STARTED = 'aggregation:started',
  AGGREGATION_PROGRESS = 'aggregation:progress',
  AGGREGATION_COMPLETED = 'aggregation:completed',
}

export interface RealtimeEvent<T = any> {
  id: string
  type: EventType
  timestamp: Date
  data: T
  metadata?: {
    taskId?: string
    serviceId?: string
    sessionId?: string
    userId?: string
  }
}

export interface TaskProgressData {
  taskId: string
  taskName: string
  step: number
  totalSteps: number
  currentAction: string
  percentage: number
  logs?: string[]
  screenshots?: string[]
}

export interface CaptchaEventData {
  taskId: string
  captchaType: string
  siteKey?: string
  pageUrl?: string
  imageBase64?: string
  solver?: string
  solution?: string
  error?: string
}

export interface ServiceEventData {
  serviceId: string
  serviceName: string
  status: string
  usage?: {
    current: number
    limit: number
    percentage: number
  }
  error?: string
}

export interface RegistrationEventData {
  taskId: string
  serviceId: string
  serviceName: string
  step?: string
  stepNumber?: number
  totalSteps?: number
  credentials?: {
    email?: string
    username?: string
  }
  error?: string
}

type EventCallback<T = any> = (event: RealtimeEvent<T>) => void

export class RealtimeEventEmitter {
  private listeners: Map<EventType, Set<EventCallback>> = new Map()
  private allListeners: Set<EventCallback> = new Set()
  private eventHistory: RealtimeEvent[] = []
  private maxHistorySize: number = 1000

  on<T = any>(type: EventType, callback: EventCallback<T>): () => void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set())
    }
    this.listeners.get(type)!.add(callback as EventCallback)

    return () => this.off(type, callback)
  }

  onAll(callback: EventCallback): () => void {
    this.allListeners.add(callback)
    return () => this.allListeners.delete(callback)
  }

  off<T = any>(type: EventType, callback: EventCallback<T>): void {
    const typeListeners = this.listeners.get(type)
    if (typeListeners) {
      typeListeners.delete(callback as EventCallback)
    }
  }

  emit<T = any>(type: EventType, data: T, metadata?: RealtimeEvent['metadata']): RealtimeEvent<T> {
    const event: RealtimeEvent<T> = {
      id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      timestamp: new Date(),
      data,
      metadata,
    }

    this.eventHistory.push(event)
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift()
    }

    const typeListeners = this.listeners.get(type)
    if (typeListeners) {
      typeListeners.forEach((callback) => {
        try {
          callback(event)
        } catch (error) {
          console.error(`Event listener error for ${type}:`, error)
        }
      })
    }

    this.allListeners.forEach((callback) => {
      try {
        callback(event)
      } catch (error) {
        console.error(`Global event listener error:`, error)
      }
    })

    return event
  }

  getHistory(type?: EventType, limit: number = 100): RealtimeEvent[] {
    let history = this.eventHistory
    if (type) {
      history = history.filter((e) => e.type === type)
    }
    return history.slice(-limit)
  }

  clearHistory(): void {
    this.eventHistory = []
  }

  emitTaskStarted(taskId: string, taskName: string, totalSteps: number): void {
    this.emit<TaskProgressData>(EventType.TASK_STARTED, {
      taskId,
      taskName,
      step: 0,
      totalSteps,
      currentAction: 'Starting...',
      percentage: 0,
    }, { taskId })
  }

  emitTaskProgress(
    taskId: string,
    taskName: string,
    step: number,
    totalSteps: number,
    currentAction: string,
    logs?: string[]
  ): void {
    this.emit<TaskProgressData>(EventType.TASK_PROGRESS, {
      taskId,
      taskName,
      step,
      totalSteps,
      currentAction,
      percentage: Math.round((step / totalSteps) * 100),
      logs,
    }, { taskId })
  }

  emitTaskCompleted(taskId: string, taskName: string, data?: any): void {
    this.emit<TaskProgressData & { result?: any }>(EventType.TASK_COMPLETED, {
      taskId,
      taskName,
      step: 1,
      totalSteps: 1,
      currentAction: 'Completed',
      percentage: 100,
      result: data,
    }, { taskId })
  }

  emitTaskFailed(taskId: string, taskName: string, error: string): void {
    this.emit<TaskProgressData & { error: string }>(EventType.TASK_FAILED, {
      taskId,
      taskName,
      step: 0,
      totalSteps: 0,
      currentAction: 'Failed',
      percentage: 0,
      error,
    }, { taskId })
  }

  emitCaptchaManualRequired(
    taskId: string,
    captchaType: string,
    pageUrl: string,
    imageBase64?: string
  ): void {
    this.emit<CaptchaEventData>(EventType.CAPTCHA_MANUAL_REQUIRED, {
      taskId,
      captchaType,
      pageUrl,
      imageBase64,
    }, { taskId })
  }

  emitServiceQuotaWarning(
    serviceId: string,
    serviceName: string,
    current: number,
    limit: number
  ): void {
    this.emit<ServiceEventData>(EventType.SERVICE_QUOTA_WARNING, {
      serviceId,
      serviceName,
      status: 'warning',
      usage: { current, limit, percentage: Math.round((current / limit) * 100) },
    }, { serviceId })
  }

  emitRegistrationStep(
    taskId: string,
    serviceId: string,
    serviceName: string,
    step: string,
    stepNumber: number,
    totalSteps: number
  ): void {
    this.emit<RegistrationEventData>(EventType.REGISTRATION_STEP, {
      taskId,
      serviceId,
      serviceName,
      step,
      stepNumber,
      totalSteps,
    }, { taskId, serviceId })
  }

  emitProfileRotated(poolId: string, previousProfileId: string, newProfileId: string): void {
    this.emit(EventType.PROFILE_ROTATED, {
      poolId,
      previousProfileId,
      newProfileId,
    })
  }

  emitProxyRotated(poolId: string, previousProxyId: string, newProxyId: string): void {
    this.emit(EventType.PROXY_ROTATED, {
      poolId,
      previousProxyId,
      newProxyId,
    })
  }

  emitAggregationProgress(
    sourceId: string,
    sourceName: string,
    current: number,
    total: number,
    servicesFound: number
  ): void {
    this.emit(EventType.AGGREGATION_PROGRESS, {
      sourceId,
      sourceName,
      current,
      total,
      servicesFound,
      percentage: Math.round((current / total) * 100),
    })
  }
}

export const globalEventEmitter = new RealtimeEventEmitter()
