// CAPTCHA Solving System for FreebeeZ
import axios from 'axios'

export interface CaptchaSolution {
  success: boolean
  solution?: string
  error?: string
  cost?: number
  solveTime?: number
}

export interface CaptchaTask {
  id: string
  type: 'recaptcha_v2' | 'recaptcha_v3' | 'hcaptcha' | 'cloudflare' | 'image' | 'text'
  siteKey?: string
  pageUrl?: string
  imageBase64?: string
  question?: string
  minScore?: number
  action?: string
}

export abstract class CaptchaSolver {
  protected apiKey: string
  protected baseUrl: string

  constructor(apiKey: string, baseUrl: string) {
    this.apiKey = apiKey
    this.baseUrl = baseUrl
  }

  abstract solveCaptcha(task: CaptchaTask): Promise<CaptchaSolution>
  abstract getBalance(): Promise<number>
}

// 2captcha.com integration
export class TwoCaptchaSolver extends CaptchaSolver {
  constructor(apiKey: string) {
    super(apiKey, 'https://2captcha.com')
  }

  async solveCaptcha(task: CaptchaTask): Promise<CaptchaSolution> {
    const startTime = Date.now()

    try {
      // Submit captcha task
      const taskId = await this.submitTask(task)
      if (!taskId) {
        return { success: false, error: 'Failed to submit task' }
      }

      // Poll for solution
      const solution = await this.pollForSolution(taskId)
      
      return {
        success: true,
        solution,
        cost: this.getCost(task.type),
        solveTime: Date.now() - startTime
      }

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        solveTime: Date.now() - startTime
      }
    }
  }

  private async submitTask(task: CaptchaTask): Promise<string | null> {
    const formData = new FormData()
    formData.append('key', this.apiKey)
    formData.append('json', '1')

    switch (task.type) {
      case 'recaptcha_v2':
        formData.append('method', 'userrecaptcha')
        formData.append('googlekey', task.siteKey!)
        formData.append('pageurl', task.pageUrl!)
        break

      case 'recaptcha_v3':
        formData.append('method', 'userrecaptcha')
        formData.append('version', 'v3')
        formData.append('googlekey', task.siteKey!)
        formData.append('pageurl', task.pageUrl!)
        formData.append('min_score', (task.minScore || 0.3).toString())
        formData.append('action', task.action || 'verify')
        break

      case 'hcaptcha':
        formData.append('method', 'hcaptcha')
        formData.append('sitekey', task.siteKey!)
        formData.append('pageurl', task.pageUrl!)
        break

      case 'image':
        formData.append('method', 'base64')
        formData.append('body', task.imageBase64!)
        break

      case 'text':
        formData.append('method', 'textcaptcha')
        formData.append('textcaptcha', task.question!)
        break
    }

    const response = await axios.post(`${this.baseUrl}/in.php`, formData)
    
    if (response.data.status === 1) {
      return response.data.request
    }
    
    throw new Error(response.data.error_text || 'Failed to submit task')
  }

  private async pollForSolution(taskId: string, maxAttempts = 60): Promise<string> {
    for (let i = 0; i < maxAttempts; i++) {
      await this.sleep(5000) // Wait 5 seconds between polls

      const response = await axios.get(`${this.baseUrl}/res.php`, {
        params: {
          key: this.apiKey,
          action: 'get',
          id: taskId,
          json: 1
        }
      })

      if (response.data.status === 1) {
        return response.data.request
      }

      if (response.data.error_text && response.data.error_text !== 'CAPCHA_NOT_READY') {
        throw new Error(response.data.error_text)
      }
    }

    throw new Error('Timeout waiting for solution')
  }

  async getBalance(): Promise<number> {
    const response = await axios.get(`${this.baseUrl}/res.php`, {
      params: {
        key: this.apiKey,
        action: 'getbalance',
        json: 1
      }
    })

    if (response.data.status === 1) {
      return parseFloat(response.data.request)
    }

    throw new Error(response.data.error_text || 'Failed to get balance')
  }

  private getCost(type: string): number {
    const costs = {
      'recaptcha_v2': 0.001,
      'recaptcha_v3': 0.002,
      'hcaptcha': 0.001,
      'image': 0.0005,
      'text': 0.0005
    }
    return costs[type as keyof typeof costs] || 0.001
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

// AntiCaptcha.com integration
export class AntiCaptchaSolver extends CaptchaSolver {
  constructor(apiKey: string) {
    super(apiKey, 'https://api.anti-captcha.com')
  }

  async solveCaptcha(task: CaptchaTask): Promise<CaptchaSolution> {
    const startTime = Date.now()

    try {
      const taskId = await this.createTask(task)
      const solution = await this.getTaskResult(taskId)
      
      return {
        success: true,
        solution,
        cost: this.getCost(task.type),
        solveTime: Date.now() - startTime
      }

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        solveTime: Date.now() - startTime
      }
    }
  }

  private async createTask(task: CaptchaTask): Promise<number> {
    const taskData = this.buildTaskData(task)
    
    const response = await axios.post(`${this.baseUrl}/createTask`, {
      clientKey: this.apiKey,
      task: taskData,
      softId: 0
    })

    if (response.data.errorId === 0) {
      return response.data.taskId
    }

    throw new Error(response.data.errorDescription || 'Failed to create task')
  }

  private buildTaskData(task: CaptchaTask): any {
    switch (task.type) {
      case 'recaptcha_v2':
        return {
          type: 'NoCaptchaTaskProxyless',
          websiteURL: task.pageUrl,
          websiteKey: task.siteKey
        }

      case 'recaptcha_v3':
        return {
          type: 'RecaptchaV3TaskProxyless',
          websiteURL: task.pageUrl,
          websiteKey: task.siteKey,
          minScore: task.minScore || 0.3,
          pageAction: task.action || 'verify'
        }

      case 'hcaptcha':
        return {
          type: 'HCaptchaTaskProxyless',
          websiteURL: task.pageUrl,
          websiteKey: task.siteKey
        }

      case 'image':
        return {
          type: 'ImageToTextTask',
          body: task.imageBase64
        }

      default:
        throw new Error(`Unsupported task type: ${task.type}`)
    }
  }

  private async getTaskResult(taskId: number): Promise<string> {
    for (let i = 0; i < 60; i++) {
      await this.sleep(5000)

      const response = await axios.post(`${this.baseUrl}/getTaskResult`, {
        clientKey: this.apiKey,
        taskId
      })

      if (response.data.errorId !== 0) {
        throw new Error(response.data.errorDescription)
      }

      if (response.data.status === 'ready') {
        return response.data.solution.gRecaptchaResponse || response.data.solution.text
      }
    }

    throw new Error('Timeout waiting for solution')
  }

  async getBalance(): Promise<number> {
    const response = await axios.post(`${this.baseUrl}/getBalance`, {
      clientKey: this.apiKey
    })

    if (response.data.errorId === 0) {
      return response.data.balance
    }

    throw new Error(response.data.errorDescription || 'Failed to get balance')
  }

  private getCost(type: string): number {
    const costs = {
      'recaptcha_v2': 0.001,
      'recaptcha_v3': 0.002,
      'hcaptcha': 0.001,
      'image': 0.0005
    }
    return costs[type as keyof typeof costs] || 0.001
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

// CAPTCHA Manager that handles multiple solvers
export class CaptchaManager {
  private solvers: Map<string, CaptchaSolver> = new Map()
  private defaultSolver: string | null = null

  addSolver(name: string, solver: CaptchaSolver, isDefault = false): void {
    this.solvers.set(name, solver)
    if (isDefault || this.defaultSolver === null) {
      this.defaultSolver = name
    }
  }

  async solveCaptcha(task: CaptchaTask, solverName?: string): Promise<CaptchaSolution> {
    const solver = this.getSolver(solverName)
    if (!solver) {
      return {
        success: false,
        error: `Solver ${solverName || this.defaultSolver} not found`
      }
    }

    return await solver.solveCaptcha(task)
  }

  async getBalance(solverName?: string): Promise<number> {
    const solver = this.getSolver(solverName)
    if (!solver) {
      throw new Error(`Solver ${solverName || this.defaultSolver} not found`)
    }

    return await solver.getBalance()
  }

  private getSolver(name?: string): CaptchaSolver | null {
    const solverName = name || this.defaultSolver
    return solverName ? this.solvers.get(solverName) || null : null
  }

  listSolvers(): string[] {
    return Array.from(this.solvers.keys())
  }
}