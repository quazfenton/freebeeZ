// Main Orchestrator System for FreebeeZ
import { BrowserAutomationEngine, BrowserProfile } from '../browser-automation'
import { ServiceDiscoveryEngine, UserProfile, ServiceTemplate } from '../service-discovery'
import { EmailManager, EmailAccount } from '../email-manager'
import { CaptchaManager, TwoCaptchaSolver, AntiCaptchaSolver } from '../captcha-solver'
import { InMemoryServiceRegistry } from '../service-registry'
import { LocalCredentialManager } from '../credential-manager'
import { InMemoryAutomationRegistry } from '../automation-registry'
import { ServiceIntegration, ServiceCategory } from '../service-integrations'

export interface OrchestrationTask {
  id: string
  name: string
  type: 'auto_register' | 'bulk_register' | 'service_rotation' | 'account_maintenance'
  services: string[] // Service template IDs
  profiles?: string[] // User profile IDs
  settings: OrchestrationSettings
  status: 'pending' | 'running' | 'completed' | 'failed' | 'paused'
  progress: number
  results: OrchestrationResult[]
  createdAt: Date
  startedAt?: Date
  completedAt?: Date
}

export interface OrchestrationSettings {
  maxConcurrent: number
  retryAttempts: number
  delayBetweenTasks: number
  useRandomDelay: boolean
  captchaSolver?: string
  emailProvider?: string
  browserRotation: boolean
  profileRotation: boolean
  notifyOnCompletion: boolean
  notifyOnFailure: boolean
}

export interface OrchestrationResult {
  serviceId: string
  profileId: string
  success: boolean
  credentials?: any
  error?: string
  duration: number
  screenshots: string[]
  logs: string[]
  timestamp: Date
}

export interface NotificationConfig {
  email?: string
  webhook?: string
  slack?: string
  discord?: string
}

export class FreebeeZOrchestrator {
  private browserEngine: BrowserAutomationEngine
  private discoveryEngine: ServiceDiscoveryEngine
  private emailManager: EmailManager
  private captchaManager: CaptchaManager
  private serviceRegistry: InMemoryServiceRegistry
  private credentialManager: LocalCredentialManager
  private automationRegistry: InMemoryAutomationRegistry
  
  private activeTasks: Map<string, OrchestrationTask> = new Map()
  private taskQueue: OrchestrationTask[] = []
  private isProcessing = false
  
  constructor() {
    this.browserEngine = new BrowserAutomationEngine()
    this.discoveryEngine = new ServiceDiscoveryEngine()
    this.emailManager = new EmailManager()
    this.captchaManager = new CaptchaManager()
    this.serviceRegistry = new InMemoryServiceRegistry()
    this.credentialManager = new LocalCredentialManager()
    this.automationRegistry = new InMemoryAutomationRegistry()
  }

  async initialize(config?: {
    twoCaptchaKey?: string
    antiCaptchaKey?: string
    notificationConfig?: NotificationConfig
  }): Promise<void> {
    // Initialize all subsystems
    await this.browserEngine.initialize()
    await this.discoveryEngine.initialize()

    // Setup CAPTCHA solvers if API keys provided
    if (config?.twoCaptchaKey) {
      this.captchaManager.addSolver('2captcha', new TwoCaptchaSolver(config.twoCaptchaKey), true)
    }
    if (config?.antiCaptchaKey) {
      this.captchaManager.addSolver('anticaptcha', new AntiCaptchaSolver(config.antiCaptchaKey))
    }

    // Start task processor
    this.startTaskProcessor()
  }

  async createAutoRegistrationTask(
    serviceIds: string[],
    settings: Partial<OrchestrationSettings> = {}
  ): Promise<OrchestrationTask> {
    const task: OrchestrationTask = {
      id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: `Auto-register ${serviceIds.length} services`,
      type: 'auto_register',
      services: serviceIds,
      settings: {
        maxConcurrent: 3,
        retryAttempts: 3,
        delayBetweenTasks: 5000,
        useRandomDelay: true,
        browserRotation: true,
        profileRotation: true,
        notifyOnCompletion: true,
        notifyOnFailure: true,
        ...settings
      },
      status: 'pending',
      progress: 0,
      results: [],
      createdAt: new Date()
    }

    this.taskQueue.push(task)
    return task
  }

  async createBulkRegistrationTask(
    serviceIds: string[],
    profileCount: number,
    settings: Partial<OrchestrationSettings> = {}
  ): Promise<OrchestrationTask> {
    const task: OrchestrationTask = {
      id: `bulk_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: `Bulk register ${serviceIds.length} services with ${profileCount} profiles`,
      type: 'bulk_register',
      services: serviceIds,
      settings: {
        maxConcurrent: 2,
        retryAttempts: 2,
        delayBetweenTasks: 10000,
        useRandomDelay: true,
        browserRotation: true,
        profileRotation: true,
        notifyOnCompletion: true,
        notifyOnFailure: true,
        ...settings
      },
      status: 'pending',
      progress: 0,
      results: [],
      createdAt: new Date()
    }

    // Create profiles for bulk registration
    const profiles: string[] = []
    for (let i = 0; i < profileCount; i++) {
      const profile = await this.discoveryEngine.createUserProfile(`bulk_profile_${i}`)
      profiles.push(profile.id)
    }
    task.profiles = profiles

    this.taskQueue.push(task)
    return task
  }

  async pauseTask(taskId: string): Promise<boolean> {
    const task = this.activeTasks.get(taskId)
    if (task && task.status === 'running') {
      task.status = 'paused'
      return true
    }
    return false
  }

  async resumeTask(taskId: string): Promise<boolean> {
    const task = this.activeTasks.get(taskId) || this.taskQueue.find(t => t.id === taskId)
    if (task && task.status === 'paused') {
      task.status = 'pending'
      if (!this.taskQueue.includes(task)) {
        this.taskQueue.push(task)
      }
      return true
    }
    return false
  }

  async cancelTask(taskId: string): Promise<boolean> {
    const task = this.activeTasks.get(taskId)
    if (task) {
      task.status = 'failed'
      task.completedAt = new Date()
      this.activeTasks.delete(taskId)
      return true
    }

    const queueIndex = this.taskQueue.findIndex(t => t.id === taskId)
    if (queueIndex !== -1) {
      this.taskQueue.splice(queueIndex, 1)
      return true
    }

    return false
  }

  getTaskStatus(taskId: string): OrchestrationTask | null {
    return this.activeTasks.get(taskId) || this.taskQueue.find(t => t.id === taskId) || null
  }

  getAllTasks(): OrchestrationTask[] {
    return [...Array.from(this.activeTasks.values()), ...this.taskQueue]
  }

  async discoverServices(category?: ServiceCategory): Promise<ServiceTemplate[]> {
    return await this.discoveryEngine.discoverServices(category)
  }

  async createUserProfile(name?: string): Promise<UserProfile> {
    return await this.discoveryEngine.createUserProfile(name)
  }

  async createEmailAccount(username?: string, provider?: string): Promise<EmailAccount> {
    return await this.emailManager.createEmail(username, provider)
  }

  private async startTaskProcessor(): Promise<void> {
    if (this.isProcessing) return
    
    this.isProcessing = true
    
    while (this.isProcessing) {
      if (this.taskQueue.length > 0) {
        const task = this.taskQueue.shift()!
        if (task.status === 'pending') {
          await this.processTask(task)
        }
      }
      
      // Wait before checking for more tasks
      await this.sleep(1000)
    }
  }

  private async processTask(task: OrchestrationTask): Promise<void> {
    task.status = 'running'
    task.startedAt = new Date()
    this.activeTasks.set(task.id, task)

    try {
      switch (task.type) {
        case 'auto_register':
          await this.processAutoRegistration(task)
          break
        case 'bulk_register':
          await this.processBulkRegistration(task)
          break
        case 'service_rotation':
          await this.processServiceRotation(task)
          break
        case 'account_maintenance':
          await this.processAccountMaintenance(task)
          break
      }

      task.status = 'completed'
      task.progress = 100
      
      if (task.settings.notifyOnCompletion) {
        await this.sendNotification(task, 'completed')
      }

    } catch (error) {
      task.status = 'failed'
      
      if (task.settings.notifyOnFailure) {
        await this.sendNotification(task, 'failed', error instanceof Error ? error.message : 'Unknown error')
      }
    } finally {
      task.completedAt = new Date()
      this.activeTasks.delete(task.id)
    }
  }

  private async processAutoRegistration(task: OrchestrationTask): Promise<void> {
    const totalServices = task.services.length
    let completed = 0

    for (const serviceId of task.services) {
      if (task.status === 'paused') {
        break
      }

      try {
        // Create a new profile for each service if profile rotation is enabled
        let profileId: string | undefined
        if (task.settings.profileRotation) {
          const profile = await this.discoveryEngine.createUserProfile()
          profileId = profile.id
        }

        const result = await this.discoveryEngine.autoRegisterService(serviceId, profileId)
        
        task.results.push({
          serviceId,
          profileId: profileId || 'default',
          success: result.success,
          credentials: result.credentials,
          error: result.error,
          duration: 0, // Will be calculated by the discovery engine
          screenshots: result.screenshots,
          logs: [],
          timestamp: new Date()
        })

        // Store credentials if successful
        if (result.success && result.credentials) {
          await this.credentialManager.storeCredentials(serviceId, result.credentials)
        }

      } catch (error) {
        task.results.push({
          serviceId,
          profileId: 'error',
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          duration: 0,
          screenshots: [],
          logs: [],
          timestamp: new Date()
        })
      }

      completed++
      task.progress = Math.round((completed / totalServices) * 100)

      // Add delay between tasks
      if (completed < totalServices) {
        const delay = task.settings.useRandomDelay 
          ? task.settings.delayBetweenTasks + Math.random() * task.settings.delayBetweenTasks
          : task.settings.delayBetweenTasks
        await this.sleep(delay)
      }
    }
  }

  private async processBulkRegistration(task: OrchestrationTask): Promise<void> {
    const totalOperations = task.services.length * (task.profiles?.length || 1)
    let completed = 0

    for (const serviceId of task.services) {
      for (const profileId of task.profiles || ['default']) {
        if (task.status === 'paused') {
          break
        }

        try {
          const result = await this.discoveryEngine.autoRegisterService(serviceId, profileId)
          
          task.results.push({
            serviceId,
            profileId,
            success: result.success,
            credentials: result.credentials,
            error: result.error,
            duration: 0,
            screenshots: result.screenshots,
            logs: [],
            timestamp: new Date()
          })

          if (result.success && result.credentials) {
            await this.credentialManager.storeCredentials(`${serviceId}_${profileId}`, result.credentials)
          }

        } catch (error) {
          task.results.push({
            serviceId,
            profileId,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            duration: 0,
            screenshots: [],
            logs: [],
            timestamp: new Date()
          })
        }

        completed++
        task.progress = Math.round((completed / totalOperations) * 100)

        // Add delay between operations
        if (completed < totalOperations) {
          const delay = task.settings.useRandomDelay 
            ? task.settings.delayBetweenTasks + Math.random() * task.settings.delayBetweenTasks
            : task.settings.delayBetweenTasks
          await this.sleep(delay)
        }
      }
    }
  }

  private async processServiceRotation(task: OrchestrationTask): Promise<void> {
    // Implement service rotation logic
    console.log('Processing service rotation task:', task.id)
  }

  private async processAccountMaintenance(task: OrchestrationTask): Promise<void> {
    // Implement account maintenance logic
    console.log('Processing account maintenance task:', task.id)
  }

  private async sendNotification(task: OrchestrationTask, status: string, error?: string): Promise<void> {
    const message = `Task ${task.name} ${status}${error ? `: ${error}` : ''}`
    console.log(`Notification: ${message}`)
    
    // Here you would implement actual notification sending
    // (email, webhook, Slack, Discord, etc.)
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  async cleanup(): Promise<void> {
    this.isProcessing = false
    await this.browserEngine.cleanup()
    await this.discoveryEngine.cleanup()
  }
}