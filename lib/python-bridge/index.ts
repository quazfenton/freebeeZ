// Python Bridge for Advanced Automation Features
import { spawn, ChildProcess } from 'child_process'
import path from 'path'

export interface PythonScriptConfig {
  script: string
  args?: string[]
  env?: Record<string, string>
  timeout?: number
  cwd?: string
}

export interface PythonScriptResult {
  success: boolean
  stdout: string
  stderr: string
  exitCode: number | null
  duration: number
}

export interface PlaywrightAutomationConfig {
  url: string
  actions: PlaywrightAction[]
  headless?: boolean
  timeout?: number
  userAgent?: string
  viewport?: { width: number; height: number }
}

export interface PlaywrightAction {
  type: 'goto' | 'click' | 'fill' | 'wait' | 'screenshot' | 'extract' | 'scroll' | 'hover'
  selector?: string
  value?: string
  timeout?: number
  waitFor?: 'load' | 'networkidle' | 'domcontentloaded'
}

export interface CrawlingConfig {
  startUrls: string[]
  maxPages?: number
  maxDepth?: number
  allowedDomains?: string[]
  extractors: DataExtractor[]
  respectRobots?: boolean
  delay?: number
  userAgent?: string
}

export interface DataExtractor {
  name: string
  selector: string
  attribute?: string
  multiple?: boolean
  transform?: string // Python function name
}

export class PythonBridge {
  private pythonPath: string
  private scriptsPath: string
  private activeProcesses: Map<string, ChildProcess> = new Map()
  private processQueue: PythonScriptConfig[] = []
  private maxConcurrentProcesses: number = 5
  private isProcessing: boolean = false

  constructor(pythonPath = 'python3', scriptsPath = './python_scripts') {
    this.pythonPath = pythonPath
    this.scriptsPath = scriptsPath
    this.startProcessQueue()
  }

  async runScript(config: PythonScriptConfig): Promise<PythonScriptResult> {
    const startTime = Date.now()
    
    return new Promise((resolve) => {
      const args = [config.script, ...(config.args || [])]
      const options = {
        cwd: config.cwd || this.scriptsPath,
        env: { ...process.env, ...config.env },
        timeout: config.timeout || 60000
      }

      const child: ChildProcess = spawn(this.pythonPath, args, options)
      
      let stdout = ''
      let stderr = ''

      child.stdout?.on('data', (data) => {
        stdout += data.toString()
      })

      child.stderr?.on('data', (data) => {
        stderr += data.toString()
      })

      child.on('close', (code) => {
        resolve({
          success: code === 0,
          stdout,
          stderr,
          exitCode: code,
          duration: Date.now() - startTime
        })
      })

      child.on('error', (error) => {
        resolve({
          success: false,
          stdout,
          stderr: stderr + error.message,
          exitCode: null,
          duration: Date.now() - startTime
        })
      })
    })
  }

  async runPlaywrightAutomation(config: PlaywrightAutomationConfig): Promise<PythonScriptResult> {
    const scriptConfig: PythonScriptConfig = {
      script: 'playwright_automation.py',
      args: [JSON.stringify(config)],
      timeout: config.timeout || 120000
    }

    return await this.runScript(scriptConfig)
  }

  async runWebCrawler(config: CrawlingConfig): Promise<PythonScriptResult> {
    const scriptConfig: PythonScriptConfig = {
      script: 'web_crawler.py',
      args: [JSON.stringify(config)],
      timeout: 300000 // 5 minutes for crawling
    }

    return await this.runScript(scriptConfig)
  }

  async solveCaptchaWithAI(imageBase64: string, captchaType: string): Promise<PythonScriptResult> {
    const scriptConfig: PythonScriptConfig = {
      script: 'ai_captcha_solver.py',
      args: [imageBase64, captchaType],
      timeout: 30000
    }

    return await this.runScript(scriptConfig)
  }

  async generateFakeProfile(): Promise<PythonScriptResult> {
    const scriptConfig: PythonScriptConfig = {
      script: 'profile_generator.py',
      timeout: 10000
    }

    return await this.runScript(scriptConfig)
  }

  async detectCaptcha(pageScreenshot: string): Promise<PythonScriptResult> {
    const scriptConfig: PythonScriptConfig = {
      script: 'captcha_detector.py',
      args: [pageScreenshot],
      timeout: 15000
    }

    return await this.runScript(scriptConfig)
  }

  async extractEmailVerificationLink(emailContent: string): Promise<PythonScriptResult> {
    const scriptConfig: PythonScriptConfig = {
      script: 'email_link_extractor.py',
      args: [emailContent],
      timeout: 5000
    }

    return await this.runScript(scriptConfig)
  }

  async analyzeServiceRegistrationForm(pageHtml: string): Promise<PythonScriptResult> {
    const scriptConfig: PythonScriptConfig = {
      script: 'form_analyzer.py',
      args: [pageHtml],
      timeout: 10000
    }

    return await this.runScript(scriptConfig)
  }

  async generateServiceCredentials(serviceType: string, requirements: any): Promise<PythonScriptResult> {
    const scriptConfig: PythonScriptConfig = {
      script: 'credential_generator.py',
      args: [serviceType, JSON.stringify(requirements)],
      timeout: 5000
    }

    return await this.runScript(scriptConfig)
  }

  async monitorServiceHealth(serviceUrl: string, checkType: string): Promise<PythonScriptResult> {
    const scriptConfig: PythonScriptConfig = {
      script: 'service_monitor.py',
      args: [serviceUrl, checkType],
      timeout: 30000
    }

    return await this.runScript(scriptConfig)
  }

  async rotateUserAgent(): Promise<PythonScriptResult> {
    const scriptConfig: PythonScriptConfig = {
      script: 'user_agent_rotator.py',
      timeout: 2000
    }

    return await this.runScript(scriptConfig)
  }

  async generateProxyList(): Promise<PythonScriptResult> {
    const scriptConfig: PythonScriptConfig = {
      script: 'proxy_generator.py',
      timeout: 30000
    }

    return await this.runScript(scriptConfig)
  }

  private startProcessQueue(): void {
    if (this.isProcessing) return
    
    this.isProcessing = true
    this.processQueueWorker()
  }

  private async processQueueWorker(): Promise<void> {
    while (this.isProcessing) {
      if (this.processQueue.length > 0 && this.activeProcesses.size < this.maxConcurrentProcesses) {
        const config = this.processQueue.shift()!
        this.executeQueuedScript(config)
      }
      
      // Wait before checking queue again
      await new Promise(resolve => setTimeout(resolve, 100))
    }
  }

  private async executeQueuedScript(config: PythonScriptConfig): Promise<void> {
    const processId = `process_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    try {
      const result = await this.runScript(config)
      // Handle result if needed
    } catch (error) {
      console.error(`Queued script execution failed:`, error)
    } finally {
      this.activeProcesses.delete(processId)
    }
  }

  async runScriptWithRetry(config: PythonScriptConfig, maxRetries: number = 3): Promise<PythonScriptResult> {
    let lastError: Error | null = null
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await this.runScript(config)
        if (result.success) {
          return result
        }
        lastError = new Error(result.stderr)
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error')
      }
      
      if (attempt < maxRetries) {
        // Exponential backoff
        const delay = Math.pow(2, attempt) * 1000
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
    
    return {
      success: false,
      stdout: '',
      stderr: lastError?.message || 'Max retries exceeded',
      exitCode: -1,
      duration: 0
    }
  }

  async runParallelScripts(configs: PythonScriptConfig[]): Promise<PythonScriptResult[]> {
    const promises = configs.map(config => this.runScript(config))
    return await Promise.all(promises)
  }

  queueScript(config: PythonScriptConfig): void {
    this.processQueue.push(config)
  }

  getQueueLength(): number {
    return this.processQueue.length
  }

  getActiveProcessCount(): number {
    return this.activeProcesses.size
  }

  setMaxConcurrentProcesses(max: number): void {
    this.maxConcurrentProcesses = Math.max(1, max)
  }

  async killAllProcesses(): Promise<void> {
    const killPromises = Array.from(this.activeProcesses.values()).map(process => {
      return new Promise<void>((resolve) => {
        process.kill('SIGTERM')
        process.on('exit', () => resolve())
        // Force kill after 5 seconds
        setTimeout(() => {
          process.kill('SIGKILL')
          resolve()
        }, 5000)
      })
    })
    
    await Promise.all(killPromises)
    this.activeProcesses.clear()
  }

  cleanup(): void {
    this.isProcessing = false
    this.processQueue.length = 0
    this.killAllProcesses()
  }

  // Enhanced service-specific methods with better error handling and validation

  async runAdvancedAutomation(config: PlaywrightAutomationConfig): Promise<PythonScriptResult> {
    // Validate configuration
    if (!config.url || !config.actions || config.actions.length === 0) {
      return {
        success: false,
        stdout: '',
        stderr: 'Invalid automation configuration: URL and actions are required',
        exitCode: -1,
        duration: 0
      }
    }

    const scriptConfig: PythonScriptConfig = {
      script: 'advanced_playwright_automation.py',
      args: [JSON.stringify(config)],
      timeout: config.timeout || 120000,
      env: {
        PLAYWRIGHT_BROWSERS_PATH: process.env.PLAYWRIGHT_BROWSERS_PATH || '',
        HEADLESS: config.headless ? 'true' : 'false'
      }
    }

    return await this.runScriptWithRetry(scriptConfig, 2)
  }

  async runServiceRegistrationBot(serviceConfig: any): Promise<PythonScriptResult> {
    const scriptConfig: PythonScriptConfig = {
      script: 'service_registration_bot.py',
      args: [JSON.stringify(serviceConfig)],
      timeout: 180000 // 3 minutes for registration
    }

    return await this.runScriptWithRetry(scriptConfig, 3)
  }

  async runIntelligentCaptchaSolver(imageData: string, captchaType: string, aiModel?: string): Promise<PythonScriptResult> {
    const scriptConfig: PythonScriptConfig = {
      script: 'intelligent_captcha_solver.py',
      args: [imageData, captchaType, aiModel || 'default'],
      timeout: 45000,
      env: {
        OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
        ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || ''
      }
    }

    return await this.runScript(scriptConfig)
  }

  async runProfileConsistencyChecker(profileData: any): Promise<PythonScriptResult> {
    const scriptConfig: PythonScriptConfig = {
      script: 'profile_consistency_checker.py',
      args: [JSON.stringify(profileData)],
      timeout: 15000
    }

    return await this.runScript(scriptConfig)
  }

  async runServiceHealthMonitor(services: string[]): Promise<PythonScriptResult> {
    const scriptConfig: PythonScriptConfig = {
      script: 'service_health_monitor.py',
      args: [JSON.stringify(services)],
      timeout: 60000
    }

    return await this.runScript(scriptConfig)
  }

  async runProxyValidator(proxyList: any[]): Promise<PythonScriptResult> {
    const scriptConfig: PythonScriptConfig = {
      script: 'proxy_validator.py',
      args: [JSON.stringify(proxyList)],
      timeout: 120000
    }

    return await this.runScript(scriptConfig)
  }

  async runEmailVerificationExtractor(emailContent: string, serviceType: string): Promise<PythonScriptResult> {
    const scriptConfig: PythonScriptConfig = {
      script: 'advanced_email_extractor.py',
      args: [emailContent, serviceType],
      timeout: 10000
    }

    return await this.runScript(scriptConfig)
  }

  async runBehaviorAnalyzer(sessionData: any): Promise<PythonScriptResult> {
    const scriptConfig: PythonScriptConfig = {
      script: 'behavior_analyzer.py',
      args: [JSON.stringify(sessionData)],
      timeout: 30000
    }

    return await this.runScript(scriptConfig)
  }

  async runServiceDependencyAnalyzer(services: string[]): Promise<PythonScriptResult> {
    const scriptConfig: PythonScriptConfig = {
      script: 'service_dependency_analyzer.py',
      args: [JSON.stringify(services)],
      timeout: 45000
    }

    return await this.runScript(scriptConfig)
  }

  async runAIQuotaPredictor(usageData: any): Promise<PythonScriptResult> {
    const scriptConfig: PythonScriptConfig = {
      script: 'ai_quota_predictor.py',
      args: [JSON.stringify(usageData)],
      timeout: 20000
    }

    return await this.runScript(scriptConfig)
  }
}