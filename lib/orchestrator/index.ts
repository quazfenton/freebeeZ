// Main Orchestrator System for FreebeeZ
import { BrowserAutomationEngine, BrowserProfile } from '../browser-automation'
import { ServiceDiscoveryEngine, UserProfile, ServiceTemplate } from '../service-discovery'
import { EmailManager, EmailAccount } from '../email-manager'
import { CaptchaManager, TwoCaptchaSolver, AntiCaptchaSolver } from '../captcha-solver'
import { InMemoryServiceRegistry } from '../service-registry'
import { LocalCredentialManager } from '../credential-manager'
import { InMemoryAutomationRegistry } from '../automation-registry'
import { ServiceIntegration, ServiceCategory } from '../service-integrations'
import { StagehandEngine, StagehandWorkflow } from '../stagehand'
import { AIQuotaPredictor } from '../ai-quota-predictor'
import { ServiceDependencyMapper } from '../service-dependency-mapper'
import { ProfileRotationManager } from '../profile-rotation-manager'
import { ProxyRotationSystem } from '../proxy-rotation-system'
import { PythonBridge } from '../python-bridge'

export interface OrchestrationTask {
  id: string
  name: string
  type: 'auto_register' | 'bulk_register' | 'service_rotation' | 'account_maintenance' | 'stagehand_workflow'
  services: string[] // Service template IDs
  profiles?: string[] // User profile IDs
  workflow?: StagehandWorkflow // For Stagehand workflow tasks
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
  private stagehandEngine: StagehandEngine
  private aiQuotaPredictor: AIQuotaPredictor
  private dependencyMapper: ServiceDependencyMapper
  private profileRotationManager: ProfileRotationManager
  private proxyRotationSystem: ProxyRotationSystem
  private pythonBridge: PythonBridge
  
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
    this.pythonBridge = new PythonBridge()
    this.stagehandEngine = new StagehandEngine(this.browserEngine, this.pythonBridge)
    this.aiQuotaPredictor = new AIQuotaPredictor()
    this.dependencyMapper = new ServiceDependencyMapper()
    this.profileRotationManager = new ProfileRotationManager()
    this.proxyRotationSystem = new ProxyRotationSystem()
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

  async createStagehandWorkflowTask(
    workflow: StagehandWorkflow,
    settings: Partial<OrchestrationSettings> = {}
  ): Promise<OrchestrationTask> {
    const task: OrchestrationTask = {
      id: `stagehand_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: workflow.name,
      type: 'stagehand_workflow',
      services: [], // Stagehand workflows don't use service templates
      workflow: workflow,
      settings: {
        maxConcurrent: 1, // Stagehand workflows run sequentially
        retryAttempts: settings.retryAttempts ?? 3,
        delayBetweenTasks: 0,
        useRandomDelay: false,
        browserRotation: settings.browserRotation ?? true,
        profileRotation: settings.profileRotation ?? false,
        notifyOnCompletion: settings.notifyOnCompletion ?? true,
        notifyOnFailure: settings.notifyOnFailure ?? true,
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
        case 'stagehand_workflow':
          await this.processStagehandWorkflow(task)
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

  private async processStagehandWorkflow(task: OrchestrationTask): Promise<void> {
    if (!task.workflow) {
      throw new Error('Stagehand workflow task is missing workflow definition')
    }
    
    const result = await this.stagehandEngine.executeWorkflow(task.workflow)
    
    task.results.push({
      serviceId: 'stagehand_workflow',
      profileId: 'n/a',
      success: result.success,
      credentials: result.data,
      error: result.error,
      duration: result.duration,
      screenshots: result.screenshots,
      logs: result.logs,
      timestamp: new Date()
    })
    
    task.progress = 100
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

  // New methods for enhanced functionality

  async createOptimizedSetupPlan(serviceIds: string[]): Promise<any> {
    // Use dependency mapper to create an optimized setup plan
    const setupPlan = this.dependencyMapper.generateSetupPlan(serviceIds)
    
    // Enhance with AI quota predictions
    const quotaPredictions = await this.aiQuotaPredictor.getAllPredictions('day')
    
    return {
      setupPlan,
      quotaPredictions,
      estimatedCost: this.calculateEstimatedCost(serviceIds),
      riskAssessment: this.assessSetupRisk(serviceIds)
    }
  }

  async createProfileRotationTask(
    poolId: string,
    rotationStrategy: any,
    settings: Partial<OrchestrationSettings> = {}
  ): Promise<OrchestrationTask> {
    const task: OrchestrationTask = {
      id: `profile_rotation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: `Profile rotation for pool ${poolId}`,
      type: 'service_rotation',
      services: [],
      settings: {
        maxConcurrent: 1,
        retryAttempts: 2,
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

  async predictServiceUsage(serviceIds: string[], timeframe: 'hour' | 'day' | 'week' | 'month' = 'day'): Promise<any> {
    const predictions = await Promise.all(
      serviceIds.map(serviceId => this.aiQuotaPredictor.predictUsage(serviceId, timeframe))
    )

    return {
      predictions,
      totalPredictedUsage: predictions.reduce((sum, p) => sum + p.predictedUsage, 0),
      averageConfidence: predictions.reduce((sum, p) => sum + p.confidence, 0) / predictions.length,
      recommendations: predictions.flatMap(p => p.recommendations)
    }
  }

  async analyzeServiceDependencies(serviceIds: string[]): Promise<any> {
    const dependencyGraph = this.dependencyMapper.buildDependencyGraph()
    const impactAnalyses = serviceIds.map(serviceId => 
      this.dependencyMapper.analyzeDependencyImpact(serviceId)
    )

    return {
      dependencyGraph,
      impactAnalyses,
      criticalServices: this.dependencyMapper.getCriticalServices(),
      setupOrder: dependencyGraph.setupOrder.filter(id => serviceIds.includes(id))
    }
  }

  async rotateProfile(poolId: string, reason?: string): Promise<any> {
    const rotatedProfile = await this.profileRotationManager.rotateProfile(poolId, reason)
    
    if (rotatedProfile) {
      // Update browser engine with new profile
      const browserProfile = this.convertToBrowserProfile(rotatedProfile)
      // Implementation would update browser engine
    }

    return {
      success: !!rotatedProfile,
      profile: rotatedProfile,
      poolStatus: this.profileRotationManager.getPool(poolId)
    }
  }

  async rotateProxy(poolId: string, reason?: string): Promise<any> {
    const rotatedProxy = await this.proxyRotationSystem.rotateProxy(poolId, reason)
    
    return {
      success: !!rotatedProxy,
      proxy: rotatedProxy,
      poolStatus: this.proxyRotationSystem.getPool(poolId)
    }
  }

  async getSystemHealth(): Promise<any> {
    const aiQuotas = await this.aiQuotaPredictor.getAllQuotas()
    const proxyPools = this.proxyRotationSystem.getAllPools()
    const profilePools = this.profileRotationManager.getAllPools()
    const activeTasks = this.getAllTasks()

    return {
      aiServices: {
        quotas: aiQuotas,
        totalServices: aiQuotas.length,
        healthyServices: aiQuotas.filter(q => q.remainingQuota > q.totalQuota * 0.2).length
      },
      proxySystem: {
        pools: proxyPools.length,
        totalProxies: proxyPools.reduce((sum, p) => sum + p.statistics.totalProxies, 0),
        activeProxies: proxyPools.reduce((sum, p) => sum + p.statistics.activeProxies, 0),
        averageHealth: proxyPools.reduce((sum, p) => sum + p.statistics.averageHealth, 0) / proxyPools.length
      },
      profileSystem: {
        pools: profilePools.length,
        totalProfiles: this.profileRotationManager.getAllProfiles().length,
        activeProfiles: this.profileRotationManager.getActiveProfiles().length
      },
      orchestration: {
        activeTasks: activeTasks.filter(t => t.status === 'running').length,
        queuedTasks: activeTasks.filter(t => t.status === 'pending').length,
        completedTasks: activeTasks.filter(t => t.status === 'completed').length,
        failedTasks: activeTasks.filter(t => t.status === 'failed').length
      },
      pythonBridge: {
        queueLength: this.pythonBridge.getQueueLength(),
        activeProcesses: this.pythonBridge.getActiveProcessCount()
      }
    }
  }

  async optimizeSystem(): Promise<any> {
    // Optimize AI quota usage
    const aiOptimizations = await Promise.all(
      (await this.aiQuotaPredictor.getAllQuotas()).map(quota => 
        this.aiQuotaPredictor.optimizeUsage(quota.serviceId)
      )
    )

    // Optimize proxy pools
    await this.proxyRotationSystem.optimizeProxyPools()

    // Optimize profile rotation strategies
    this.profileRotationManager.optimizeRotationStrategies()

    return {
      aiOptimizations,
      message: 'System optimization completed',
      timestamp: new Date()
    }
  }

  async runAdvancedAutomation(config: any): Promise<any> {
    // Use Python bridge for advanced automation
    const result = await this.pythonBridge.runAdvancedAutomation(config)
    
    return {
      success: result.success,
      output: result.stdout,
      error: result.stderr,
      duration: result.duration
    }
  }

  private calculateEstimatedCost(serviceIds: string[]): number {
    // Implementation would calculate estimated costs
    return serviceIds.length * 0.1 // Mock calculation
  }

  private assessSetupRisk(serviceIds: string[]): string {
    const riskFactors = serviceIds.length
    if (riskFactors > 10) return 'high'
    if (riskFactors > 5) return 'medium'
    return 'low'
  }

  private convertToBrowserProfile(userProfile: any): BrowserProfile {
    // Convert user profile to browser profile format
    return {
      id: userProfile.id,
      name: userProfile.name,
      userAgent: userProfile.browserProfile?.userAgent || '',
      viewport: userProfile.browserProfile?.viewport || { width: 1920, height: 1080 },
      timezone: userProfile.preferences?.timezone || 'UTC',
      locale: userProfile.preferences?.language || 'en-US',
      cookies: [],
      localStorage: {},
      sessionStorage: {},
      fingerprint: userProfile.browserProfile?.fingerprint || {
        screen: { width: 1920, height: 1080, colorDepth: 24 },
        canvas: '',
        webgl: '',
        fonts: [],
        plugins: [],
        languages: []
      },
      createdAt: userProfile.createdAt,
      lastUsed: userProfile.lastUsed
    }
  }

  // Getters for accessing subsystems
  getBrowserEngine(): BrowserAutomationEngine {
    return this.browserEngine
  }

  getAIQuotaPredictor(): AIQuotaPredictor {
    return this.aiQuotaPredictor
  }

  getDependencyMapper(): ServiceDependencyMapper {
    return this.dependencyMapper
  }

  getProfileRotationManager(): ProfileRotationManager {
    return this.profileRotationManager
  }

  getProxyRotationSystem(): ProxyRotationSystem {
    return this.proxyRotationSystem
  }

  getPythonBridge(): PythonBridge {
    return this.pythonBridge
  }

  getStagehandEngine(): StagehandEngine {
    return this.stagehandEngine
  }

  async cleanup(): Promise<void> {
    this.isProcessing = false
    await this.browserEngine.cleanup()
    await this.discoveryEngine.cleanup()
    this.pythonBridge.cleanup()
    this.profileRotationManager.cleanup()
    this.proxyRotationSystem.cleanup()
  }
}