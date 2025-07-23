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

  constructor(pythonPath = 'python3', scriptsPath = './python_scripts') {
    this.pythonPath = pythonPath
    this.scriptsPath = scriptsPath
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
}