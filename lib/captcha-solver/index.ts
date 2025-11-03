// CAPTCHA Solving System for FreebeeZ
import axios from 'axios'
import { Page } from 'puppeteer-core';
import { NotificationManager } from '../notification';

export interface CaptchaConfig {
  provider: '2captcha' | 'anticaptcha' | 'deathbycaptcha';
  apiKey: string;
  timeout?: number;
  retries?: number;
}

export interface CaptchaSolution {
  success: boolean;
  solution?: string;
  error?: string;
  cost?: number;
  solveTime?: number;
}

export interface CaptchaTask {
  id: string;
  type: 'recaptcha_v2' | 'recaptcha_v3' | 'hcaptcha' | 'cloudflare' | 'image' | 'text';
  siteKey?: string;
  pageUrl?: string;
  imageBase64?: string;
  question?: string;
  minScore?: number;
  action?: string;
}

export abstract class CaptchaSolver {
  protected apiKey: string;
  protected baseUrl: string;
  private config: CaptchaConfig;

  constructor(apiKey: string, baseUrl: string, config: CaptchaConfig) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
    this.config = {
      timeout: 120000, // 2 minutes
      retries: 3,
      ...config
    };
  }

  abstract getBalance(): Promise<number>;

  async detectCaptcha(page: Page): Promise<boolean> {
    try {
      // Check for common CAPTCHA selectors
      const captchaSelectors = [
        '.g-recaptcha',
        '#g-recaptcha',
        '.h-captcha',
        '#h-captcha',
        '.cf-turnstile',
        '[data-sitekey]',
        'iframe[src*="recaptcha"]',
        'iframe[src*="hcaptcha"]',
        'iframe[src*="turnstile"]'
      ];

      for (const selector of captchaSelectors) {
        const element = await page.$(selector);
        if (element) {
          console.log(`CAPTCHA detected: ${selector}`);
          return true;
        }
      }

      return false;
    } catch (error) {
      console.error('Error detecting CAPTCHA:', error);
      return false;
    }
  }

  async solveCaptcha(page: Page, captchaType: 'recaptcha' | 'hcaptcha' | 'turnstile' = 'recaptcha'): Promise<CaptchaSolution> {
    const startTime = Date.now();

    try {
      const siteKey = await this.extractSiteKey(page, captchaType);
      if (!siteKey) {
        return { success: false, error: 'Could not extract site key' };
      }

      const pageUrl = page.url();
      let solution: string;

      switch (this.config.provider) {
        case '2captcha':
          solution = await this.solve2Captcha(siteKey, pageUrl, captchaType);
          break;
        case 'anticaptcha':
          solution = await this.solveAntiCaptcha(siteKey, pageUrl, captchaType);
          break;
        case 'deathbycaptcha':
          solution = await this.solveDeathByCaptcha(siteKey, pageUrl, captchaType);
          break;
        default:
          throw new Error(`Unsupported CAPTCHA provider: ${this.config.provider}`);
      }

      // Inject solution into page
      await this.injectSolution(page, solution, captchaType);

      const solveTime = Date.now() - startTime;
      return {
        success: true,
        solution,
        solveTime,
        cost: this.calculateCost(captchaType)
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        solveTime: Date.now() - startTime
      };
    }
  }

  private async extractSiteKey(page: Page, captchaType: string): Promise<string | null> {
    try {
      let siteKey: string | null = null;

      switch (captchaType) {
        case 'recaptcha':
          siteKey = await page.evaluate(() => {
            const element = document.querySelector('.g-recaptcha, #g-recaptcha, [data-sitekey]');
            return element?.getAttribute('data-sitekey') || null;
          });
          break;
        case 'hcaptcha':
          siteKey = await page.evaluate(() => {
            const element = document.querySelector('.h-captcha, #h-captcha, [data-sitekey]');
            return element?.getAttribute('data-sitekey') || null;
          });
          break;
        case 'turnstile':
          siteKey = await page.evaluate(() => {
            const element = document.querySelector('.cf-turnstile, [data-sitekey]');
            return element?.getAttribute('data-sitekey') || null;
          });
          break;
      }

      return siteKey;
    } catch (error) {
      console.error('Error extracting site key:', error);
      return null;
    }
  }

  private async solve2Captcha(siteKey: string, pageUrl: string, captchaType: string): Promise<string> {
    const submitUrl = 'https://2captcha.com/in.php';
    const resultUrl = 'https://2captcha.com/res.php';

    // Submit CAPTCHA
    const submitParams = new URLSearchParams({
      key: this.config.apiKey,
      method: captchaType === 'recaptcha' ? 'userrecaptcha' : 'hcaptcha',
      googlekey: siteKey,
      pageurl: pageUrl,
      json: '1'
    });

    const submitResponse = await fetch(submitUrl, {
      method: 'POST',
      body: submitParams
    });

    const submitResult = await submitResponse.json();
    if (submitResult.status !== 1) {
      throw new Error(`2Captcha submit error: ${submitResult.error_text}`);
    }

    const captchaId = submitResult.request;

    // Poll for result
    const maxAttempts = Math.floor(this.config.timeout! / 5000);
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await new Promise(resolve => setTimeout(resolve, 5000));

      const resultParams = new URLSearchParams({
        key: this.config.apiKey,
        action: 'get',
        id: captchaId,
        json: '1'
      });

      const resultResponse = await fetch(`${resultUrl}?${resultParams}`);
      const result = await resultResponse.json();

      if (result.status === 1) {
        return result.request;
      } else if (result.error_text && result.error_text !== 'CAPTCHA_NOT_READY') {
        throw new Error(`2Captcha error: ${result.error_text}`);
      }
    }

    throw new Error('2Captcha timeout');
  }

  private async solveAntiCaptcha(siteKey: string, pageUrl: string, captchaType: string): Promise<string> {
    const baseUrl = 'https://api.anti-captcha.com';

    // Create task
    const createTaskResponse = await fetch(`${baseUrl}/createTask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientKey: this.config.apiKey,
        task: {
          type: captchaType === 'recaptcha' ? 'NoCaptchaTaskProxyless' : 'HCaptchaTaskProxyless',
          websiteURL: pageUrl,
          websiteKey: siteKey
        }
      })
    });

    const createResult = await createTaskResponse.json();
    if (createResult.errorId !== 0) {
      throw new Error(`AntiCaptcha create task error: ${createResult.errorDescription}`);
    }

    const taskId = createResult.taskId;

    // Poll for result
    const maxAttempts = Math.floor(this.config.timeout! / 5000);
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await new Promise(resolve => setTimeout(resolve, 5000));

      const resultResponse = await fetch(`${baseUrl}/getTaskResult`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientKey: this.config.apiKey,
          taskId: taskId
        })
      });

      const result = await resultResponse.json();

      if (result.status === 'ready') {
        return result.solution.gRecaptchaResponse;
      } else if (result.errorId !== 0) {
        throw new Error(`AntiCaptcha error: ${result.errorDescription}`);
      }
    }

    throw new Error('AntiCaptcha timeout');
  }

  private async solveDeathByCaptcha(siteKey: string, pageUrl: string, captchaType: string): Promise<string> {
    // Implementation for DeathByCaptcha
    throw new Error('DeathByCaptcha not implemented yet');
  }

  private async injectSolution(page: Page, solution: string, captchaType: string): Promise<void> {
    try {
      switch (captchaType) {
        case 'recaptcha':
          await page.evaluate((token) => {
            const textarea = document.getElementById('g-recaptcha-response') as HTMLTextAreaElement;
            if (textarea) {
              textarea.innerHTML = token;
              textarea.value = token;
              textarea.style.display = 'block';
            }
            
            // Trigger callback if exists
            if (window.grecaptcha && window.grecaptcha.getResponse) {
              const callback = window.grecaptcha.getResponse();
              if (typeof callback === 'function') {
                callback(token);
              }
            }
          }, solution);
          break;
          
        case 'hcaptcha':
          await page.evaluate((token) => {
            const textarea = document.querySelector('[name="h-captcha-response"]') as HTMLTextAreaElement;
            if (textarea) {
              textarea.innerHTML = token;
              textarea.value = token;
            }
          }, solution);
          break;
          
        case 'turnstile':
          await page.evaluate((token) => {
            const input = document.querySelector('[name="cf-turnstile-response"]') as HTMLInputElement;
            if (input) {
              input.value = token;
            }
          }, solution);
          break;
      }
    } catch (error) {
      console.error('Error injecting CAPTCHA solution:', error);
      throw error;
    }
  }

  private calculateCost(captchaType: string): number {
    const costs = {
      recaptcha: 0.001,
      hcaptcha: 0.001,
      turnstile: 0.001,
      image: 0.0005,
      text: 0.0005
    };
    return costs[captchaType as keyof typeof costs] || 0.001;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// 2captcha.com integration
export class TwoCaptchaSolver extends CaptchaSolver {
  constructor(apiKey: string, config: CaptchaConfig) {
    super(apiKey, 'https://2captcha.com', config);
  }

  async solveCaptcha(task: CaptchaTask): Promise<CaptchaSolution> {
    const startTime = Date.now();

    try {
      // Submit captcha task
      const taskId = await this.submitTask(task);
      if (!taskId) {
        return { success: false, error: 'Failed to submit task' };
      }

      // Poll for solution
      const solution = await this.pollForSolution(taskId);
      
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
    const formData = new FormData();
    formData.append('key', this.apiKey);
    formData.append('json', '1');

    switch (task.type) {
      case 'recaptcha_v2':
        formData.append('method', 'userrecaptcha');
        formData.append('googlekey', task.siteKey!);
        formData.append('pageurl', task.pageUrl!);
        break;

      case 'recaptcha_v3':
        formData.append('method', 'userrecaptcha');
        formData.append('version', 'v3');
        formData.append('googlekey', task.siteKey!);
        formData.append('pageurl', task.pageUrl!);
        formData.append('min_score', (task.minScore || 0.3).toString());
        formData.append('action', task.action || 'verify');
        break;

      case 'hcaptcha':
        formData.append('method', 'hcaptcha');
        formData.append('sitekey', task.siteKey!);
        formData.append('pageurl', task.pageUrl!);
        break;

      case 'image':
        formData.append('method', 'base64');
        formData.append('body', task.imageBase64!);
        break;

      case 'text':
        formData.append('method', 'textcaptcha');
        formData.append('textcaptcha', task.question!);
        break;
    }

    const response = await axios.post(`${this.baseUrl}/in.php`, formData);
    
    if (response.data.status === 1) {
      return response.data.request;
    }
    
    throw new Error(response.data.error_text || 'Failed to submit task');
  }

  private async pollForSolution(taskId: string, maxAttempts = 60): Promise<string> {
    for (let i = 0; i < maxAttempts; i++) {
      await this.sleep(5000); // Wait 5 seconds between polls

      const response = await axios.get(`${this.baseUrl}/res.php`, {
        params: {
          key: this.apiKey,
          action: 'get',
          id: taskId,
          json: 1
        }
      });

      if (response.data.status === 1) {
        return response.data.request;
      }

      if (response.data.error_text && response.data.error_text !== 'CAPTCHA_NOT_READY') {
        throw new Error(response.data.error_text);
      }
    }

    throw new Error('Timeout waiting for solution');
  }

  async getBalance(): Promise<number> {
    const response = await axios.get(`${this.baseUrl}/res.php`, {
      params: {
        key: this.apiKey,
        action: 'getbalance',
        json: 1
      }
    });

    if (response.data.status === 1) {
      return parseFloat(response.data.request);
    }

    throw new Error(response.data.error_text || 'Failed to get balance');
  }

  private getCost(type: string): number {
    const costs = {
      'recaptcha_v2': 0.001,
      'recaptcha_v3': 0.002,
      'hcaptcha': 0.001,
      'image': 0.0005,
      'text': 0.0005
    }
    return costs[type as keyof typeof costs] || 0.001;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// AntiCaptcha.com integration
export class AntiCaptchaSolver extends CaptchaSolver {
  constructor(apiKey: string, config: CaptchaConfig) {
    super(apiKey, 'https://api.anti-captcha.com', config);
  }

  async solveCaptcha(task: CaptchaTask): Promise<CaptchaSolution> {
    const startTime = Date.now();

    try {
      const taskId = await this.createTask(task);
      const solution = await this.getTaskResult(taskId);
      
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
    const taskData = this.buildTaskData(task);
    
    const response = await axios.post(`${this.baseUrl}/createTask`, {
      clientKey: this.apiKey,
      task: taskData,
      softId: 0
    })

    if (response.data.errorId === 0) {
      return response.data.taskId;
    }

    throw new Error(response.data.errorDescription || 'Failed to create task');
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
      await this.sleep(5000);

      const response = await axios.post(`${this.baseUrl}/getTaskResult`, {
        clientKey: this.apiKey,
        taskId
      })

      if (response.data.errorId !== 0) {
        throw new Error(response.data.errorDescription);
      }

      if (response.data.status === 'ready') {
        return response.data.solution.gRecaptchaResponse || response.data.solution.text;
      }
    }

    throw new Error('Timeout waiting for solution');
  }

  async getBalance(): Promise<number> {
    const response = await axios.post(`${this.baseUrl}/getBalance`, {
      clientKey: this.apiKey
    })

    if (response.data.errorId === 0) {
      return response.data.balance;
    }

    throw new Error(response.data.errorDescription || 'Failed to get balance');
  }

  private getCost(type: string): number {
    const costs = {
      'recaptcha_v2': 0.001,
      'recaptcha_v3': 0.002,
      'hcaptcha': 0.001,
      'image': 0.0005
    }
    return costs[type as keyof typeof costs] || 0.001;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export class DeathByCaptchaSolver extends CaptchaSolver {
  constructor(apiKey: string, config: CaptchaConfig) {
    super(apiKey, 'http://api.dbcapi.me', config);
  }

  async solveCaptcha(task: CaptchaTask): Promise<CaptchaSolution> {
    const startTime = Date.now();

    try {
      const taskId = await this.submitTask(task);
      const solution = await this.pollForSolution(taskId);

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

  private async submitTask(task: CaptchaTask): Promise<string> {
    const payload: any = {
      username: this.apiKey, // DeathByCaptcha uses API key as username
      password: '' // Password can be empty if using API key as username
    };

    switch (task.type) {
      case 'recaptcha_v2':
      case 'recaptcha_v3':
        payload.type = 4; // reCAPTCHA
        payload.googlekey = task.siteKey;
        payload.pageurl = task.pageUrl;
        break;
      case 'hcaptcha':
        payload.type = 9; // hCaptcha
        payload.sitekey = task.siteKey;
        payload.pageurl = task.pageUrl;
        break;
      case 'image':
        payload.captcha = task.imageBase64;
        break;
      case 'text':
        payload.captcha = task.question;
        break;
      default:
        throw new Error(`Unsupported CAPTCHA type for DeathByCaptcha: ${task.type}`);
    }

    const response = await axios.post(`${this.baseUrl}/api/captcha`, payload);

    if (response.data.status === 0) {
      return response.data.captcha;
    }

    throw new Error(response.data.error || 'Failed to submit task to DeathByCaptcha');
  }

  private async pollForSolution(taskId: string): Promise<string> {
    const maxAttempts = Math.floor(this.config.timeout! / 5000);
    for (let i = 0; i < maxAttempts; i++) {
      await this.sleep(5000);

      const response = await axios.get(`${this.baseUrl}/api/captcha/${taskId}`);

      if (response.data.status === 1) {
        return response.data.text;
      } else if (response.data.status === 2) {
        throw new Error('DeathByCaptcha: CAPTCHA was rejected');
      }
    }

    throw new Error('Timeout waiting for solution from DeathByCaptcha');
  }

  async getBalance(): Promise<number> {
    const response = await axios.get(`${this.baseUrl}/api/user`, {
      params: {
        username: this.apiKey,
        password: ''
      }
    });

    if (response.data.status === 0) {
      return response.data.balance / 100; // Balance is in US cents
    }

    throw new Error(response.data.error || 'Failed to get balance from DeathByCaptcha');
  }

  private getCost(type: string): number {
    const costs = {
      'recaptcha_v2': 0.001,
      'recaptcha_v3': 0.002,
      'hcaptcha': 0.001,
      'image': 0.0005,
      'text': 0.0005
    }
    return costs[type as keyof typeof costs] || 0.001;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

import { PythonBridge } from '../python-bridge';

export class IntelligentCaptchaSolver extends CaptchaSolver {
  private pythonBridge: PythonBridge;

  constructor(apiKey: string, config: CaptchaConfig) {
    super(apiKey, '', config); // Base URL not applicable for local Python script
    this.pythonBridge = new PythonBridge();
  }

  async solveCaptcha(task: CaptchaTask): Promise<CaptchaSolution> {
    const startTime = Date.now();

    try {
      if (!task.imageBase64) {
        throw new Error('Image data (base64) is required for IntelligentCaptchaSolver');
      }

      const result = await this.pythonBridge.runIntelligentCaptchaSolver(task.imageBase64, task.type);

      if (result.success) {
        return {
          success: true,
          solution: result.stdout.trim(),
          cost: this.getCost(task.type),
          solveTime: Date.now() - startTime
        }
      } else {
        throw new Error(result.stderr || 'Python script failed to solve CAPTCHA');
      }

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        solveTime: Date.now() - startTime
      }
    }
  }

  async getBalance(): Promise<number> {
    // This solver doesn't have a direct balance to check, return 0 or throw error
    return 0; 
  }

  private getCost(type: string): number {
    // Cost for AI-based solver might be different, or based on API usage
    const costs = {
      'recaptcha_v2': 0.005,
      'recaptcha_v3': 0.005,
      'hcaptcha': 0.005,
      'image': 0.003,
      'text': 0.003
    }
    return costs[type as keyof typeof costs] || 0.005;
  }
}

// CAPTCHA Manager that handles multiple solvers
export class CaptchaManager {
  private solvers: Map<string, CaptchaSolver> = new Map();
  private defaultSolver: string | null = null;
  private notificationManager: NotificationManager;

  constructor(notificationManager: NotificationManager) {
    this.notificationManager = notificationManager;
  }

  addSolver(name: string, solver: CaptchaSolver, isDefault = false): void {
    this.solvers.set(name, solver);
    if (isDefault || this.defaultSolver === null) {
      this.defaultSolver = name;
    }
  }

  async solveCaptcha(task: CaptchaTask, solverName?: string): Promise<CaptchaSolution> {
    const solver = this.getSolver(solverName);
    if (!solver) {
      return {
        success: false,
        error: `Solver ${solverName || this.defaultSolver} not found`
      }
    }

    return await solver.solveCaptcha(task);
  }

  async getBalance(solverName?: string): Promise<number> {
    const solver = this.getSolver(solverName);
    if (!solver) {
      throw new Error(`Solver ${solverName || this.defaultSolver} not found`);
    }

    return await solver.getBalance();
  }

  private getSolver(name?: string): CaptchaSolver | null {
    const solverName = name || this.defaultSolver;
    return solverName ? this.solvers.get(solverName) || null : null;
  }

  listSolvers(): string[] {
    return Array.from(this.solvers.keys());
  }

  async requestManualCaptchaSolve(task: CaptchaTask): Promise<void> {
    console.warn(`Automated CAPTCHA solving failed for task ${task.id}. Requesting manual intervention.`);
    
    // Use the notification manager to send proper notifications
    const success = await this.notificationManager.requestManualCaptchaSolve(task, task.imageBase64);
    
    if (success) {
      console.log(`Manual CAPTCHA solve notification sent for task ${task.id}`);
    } else {
      console.error(`Failed to send manual CAPTCHA solve notification for task ${task.id}`);
    }
  }
}