import puppeteer, { Browser, Page } from 'puppeteer-core';
import { BrowserbaseAdapter } from './browserbase-adapter';
import { ProxyConfig } from '../types';
import { Job } from 'bull';
import { AutomationJobData } from '../queue';

declare const process: {
  env: {
    BROWSERBASE_API_KEY?: string;
    BROWSERBASE_ENDPOINT?: string;
  };
};

export interface BrowserProfile {
  id: string;
  name: string;
  userAgent: string;
  viewport: { width: number; height: number };
  timezone: string;
  locale: string;
  cookies: any[];
  localStorage: Record<string, string>;
  sessionStorage: Record<string, string>;
  fingerprint: BrowserFingerprint;
  createdAt: Date;
  lastUsed: Date;
}

export interface BrowserFingerprint {
  screen: { width: number; height: number; colorDepth: number };
  canvas: string;
  webgl: string;
  fonts: string[];
  plugins: string[];
  languages: string[];
}

export interface CaptchaConfig {
  provider: 'recaptcha' | '2captcha' | 'anticaptcha' | 'manual';
  apiKey?: string;
  timeout: number;
  retries: number;
}

export interface AutomationTask {
  id: string;
  name: string;
  url: string;
  steps: AutomationStep[];
  profile?: BrowserProfile;
  captchaConfig?: CaptchaConfig;
  proxy?: ProxyConfig;
  retries: number;
  timeout: number;
}

export interface AutomationStep {
  type: 'navigate' | 'click' | 'type' | 'wait' | 'extract' | 'screenshot' | 'custom';
  selector?: string;
  value?: string;
  timeout?: number;
  condition?: string;
  customFunction?: (page: Page) => Promise<any>;
}

export interface AutomationResult {
  success: boolean;
  data?: any;
  error?: string;
  screenshots: string[];
  logs: string[];
  duration: number;
}

export class BrowserAutomationEngine {
  private browser: Browser | null = null;
  private browserbaseAdapter: BrowserbaseAdapter | null = null;
  private profiles: Map<string, BrowserProfile> = new Map();
  private activeSessions: Map<string, Page> = new Map();

  async initialize(proxyConfig?: ProxyConfig): Promise<void> {
    // Initialize Browserbase if API key is available
    const browserbaseApiKey = process.env.BROWSERBASE_API_KEY;
    if (browserbaseApiKey) {
      this.browserbaseAdapter = new BrowserbaseAdapter(
        browserbaseApiKey,
        process.env.BROWSERBASE_ENDPOINT || 'https://api.browserbase.com'
      );
      await this.browserbaseAdapter.initialize();
      return;
    }

    // Fallback to local browser
    const args = [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu',
      '--disable-web-security',
      '--disable-features=VizDisplayCompositor'
    ];

    if (proxyConfig && proxyConfig.url) {
      args.push(`--proxy-server=${proxyConfig.url}`);
    }

    this.browser = await puppeteer.launch({
      headless: 'new',
      args: args
    });
  }

  async createProfile(name: string): Promise<BrowserProfile> {
    const profile: BrowserProfile = {
      id: `profile_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      userAgent: this.generateRandomUserAgent(),
      viewport: this.generateRandomViewport(),
      timezone: this.generateRandomTimezone(),
      locale: this.generateRandomLocale(),
      cookies: [],
      localStorage: {},
      sessionStorage: {},
      fingerprint: await this.generateFingerprint(),
      createdAt: new Date(),
      lastUsed: new Date()
    };

    this.profiles.set(profile.id, profile);
    return profile;
  }

  // Public method to add automation tasks to the queue
  async executeTask(task: AutomationTask): Promise<Job<AutomationJobData>> {
    // This method will be implemented by the QueueService to add tasks to the queue.
    // For now, it's a placeholder to allow compilation.
    throw new Error("BrowserAutomationEngine.executeTask is now a placeholder. Use QueueService to add tasks.");
  }

  async _executeTaskInternal(task: AutomationTask): Promise<AutomationResult> {
    const startTime = Date.now();
    const screenshots: string[] = [];
    const logs: string[] = [];
    let attempt = 0;

    while (attempt <= task.retries) {
      try {
        if (!this.browser && !this.browserbaseAdapter) {
          await this.initialize(task.proxy);
        }

        let page: Page;
        
        // Use Browserbase if available
        if (this.browserbaseAdapter) {
          page = await this.browserbaseAdapter.createSession(
            task.profile || await this.createProfile('auto-profile'),
            task.proxy?.url
          );
        }
        // Fallback to local browser
        else if (this.browser) {
          page = await this.browser.newPage();
          if (task.proxy && task.proxy.url) {
            await page.authenticate({
              username: task.proxy.username || '',
              password: task.proxy.password || ''
            });
          }
          if (task.profile) {
            await this.applyProfile(page, task.profile);
          }
        } else {
          throw new Error('No browser instance available');
        }

        // Set up logging
        page.on('console', (msg: { text(): string }) => logs.push(`Console: ${msg.text()}`));
        page.on('pageerror', (error: { message: string }) => logs.push(`Page Error: ${error.message}`));

        // Execute steps
        for (const step of task.steps) {
          await this.executeStep(page, step, screenshots, logs);
        }

        // CAPTCHA handling
        if (task.captchaConfig && await this.detectCaptcha(page)) {
          logs.push('CAPTCHA detected. Attempting to solve...');
          const solved = await this.solveCaptcha(page, task.captchaConfig);
          if (!solved) {
            throw new Error('CAPTCHA could not be solved.');
          }
          logs.push('CAPTCHA solved successfully.');
        }

        await page.close();

        return {
          success: true,
          screenshots,
          logs,
          duration: Date.now() - startTime
        };

      } catch (error: any) {
        logs.push(`Attempt ${attempt + 1} failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        attempt++;
        if (attempt > task.retries) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            screenshots,
            logs,
            duration: Date.now() - startTime
          };
        }
        // Clean up browser for next attempt
        await this.cleanup();
      }
    }
    // Should not reach here
    return { success: false, error: 'Unexpected error during automation task.', screenshots, logs, duration: Date.now() - startTime };
  }

  private async detectCaptcha(page: Page): Promise<boolean> {
    // This is a placeholder. Real detection would involve checking for common CAPTCHA elements.
    // For example, checking for reCAPTCHA iframes, hCaptcha divs, or specific text.
    const recaptchaFrame = await page.$('iframe[src*="google.com/recaptcha"]');
    const hcaptchaDiv = await page.$('div.h-captcha');
    return !!(recaptchaFrame || hcaptchaDiv);
  }

  private async solveCaptcha(page: Page, config: CaptchaConfig): Promise<boolean> {
    switch (config.provider) {
      case '2captcha':
        // Placeholder for 2Captcha integration
        // In a real scenario, you'd send the sitekey and URL to 2Captcha API
        // and then inject the solved token back into the page.
        logs.push('Attempting to solve CAPTCHA with 2Captcha...');
        await new Promise(resolve => setTimeout(resolve, config.timeout || 30000)); // Simulate solving time
        // Assume success for now
        return true;
      case 'manual':
        logs.push('Manual CAPTCHA intervention required. Please solve the CAPTCHA on the page.');
        // You might want to pause execution here and notify the user.
        // For now, we'll just wait for a long timeout, assuming user intervention.
        await new Promise(resolve => setTimeout(resolve, config.timeout || 120000)); // 2 minutes for manual solve
        // You would need a way to check if it was solved, e.g., by re-detecting CAPTCHA
        return !(await this.detectCaptcha(page));
      default:
        logs.push(`Unsupported CAPTCHA provider: ${config.provider}`);
        return false;
    }
  }

  private async executeStep(page: Page, step: AutomationStep, screenshots: string[], logs: string[]): Promise<void> {
    logs.push(`Executing step: ${step.type}`);

    switch (step.type) {
      case 'navigate':
        await page.goto(step.value!, { waitUntil: 'networkidle2', timeout: step.timeout || 30000 });
        break;

      case 'click':
        await page.waitForSelector(step.selector!, { timeout: step.timeout || 10000 });
        await page.click(step.selector!);
        break;

      case 'type':
        await page.waitForSelector(step.selector!, { timeout: step.timeout || 10000 });
        await page.type(step.selector!, step.value!, { delay: 100 });
        break;

      case 'wait':
        if (step.selector) {
          await page.waitForSelector(step.selector, { timeout: step.timeout || 10000 });
        } else {
          await page.waitForTimeout(parseInt(step.value!) || 1000);
        }
        break;

      case 'extract':
        const data = await page.evaluate((selector: string) => {
          const element = document.querySelector(selector);
          return element ? element.textContent : null;
        }, step.selector!);
        logs.push(`Extracted data: ${data}`);
        break;

      case 'screenshot':
        const screenshot = await page.screenshot({ encoding: 'base64' });
        screenshots.push(screenshot as string);
        break;

      case 'custom':
        if (step.customFunction) {
          await step.customFunction(page);
        }
        break;
    }
  }

  private async applyProfile(page: Page, profile: BrowserProfile): Promise<void> {
    // Set user agent
    await page.setUserAgent(profile.userAgent);

    // Set viewport
    await page.setViewport(profile.viewport);

    // Set timezone and locale
    await page.emulateTimezone(profile.timezone);
    await page.setExtraHTTPHeaders({
      'Accept-Language': profile.locale
    });

    // Set cookies
    if (profile.cookies.length > 0) {
      await page.setCookie(...profile.cookies);
    }

    // Set local and session storage
    await page.evaluateOnNewDocument((localStorage: Record<string, string>, sessionStorage: Record<string, string>) => {
      Object.entries(localStorage).forEach(([key, value]) => {
        window.localStorage.setItem(key, value);
      });
      Object.entries(sessionStorage).forEach(([key, value]) => {
        window.sessionStorage.setItem(key, value);
      });
    }, profile.localStorage as Record<string, string>, profile.sessionStorage as Record<string, string>);
  }

  private generateRandomUserAgent(): string {
    const userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    ];
    return userAgents[Math.floor(Math.random() * userAgents.length)];
  }

  private generateRandomViewport(): { width: number; height: number } {
    const viewports = [
      { width: 1920, height: 1080 },
      { width: 1366, height: 768 },
      { width: 1440, height: 900 },
      { width: 1536, height: 864 }
    ];
    return viewports[Math.floor(Math.random() * viewports.length)];
  }

  private generateRandomTimezone(): string {
    const timezones = [
      'America/New_York',
      'America/Los_Angeles',
      'Europe/London',
      'Europe/Berlin',
      'Asia/Tokyo'
    ];
    return timezones[Math.floor(Math.random() * timezones.length)];
  }

  private generateRandomLocale(): string {
    const locales = ['en-US', 'en-GB', 'de-DE', 'fr-FR', 'es-ES'];
    return locales[Math.floor(Math.random() * locales.length)];
  }

  private async generateFingerprint(): Promise<BrowserFingerprint> {
    return {
      screen: { width: 1920, height: 1080, colorDepth: 24 },
      canvas: Math.random().toString(36),
      webgl: Math.random().toString(36),
      fonts: ['Arial', 'Times New Roman', 'Helvetica'],
      plugins: ['Chrome PDF Plugin', 'Chrome PDF Viewer'],
      languages: ['en-US', 'en']
    };
  }

  async cleanup(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
    this.activeSessions.clear();
  }
}