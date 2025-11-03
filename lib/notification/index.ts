// Notification System for FreebeeZ
// Handles various types of notifications including manual CAPTCHA solving requests

import { CaptchaTask } from '../captcha-solver';

export interface NotificationChannel {
  send(message: NotificationMessage): Promise<boolean>;
  validateConfig(): boolean;
}

export interface NotificationMessage {
  id: string;
  type: 'captcha_solving' | 'task_completed' | 'task_failed' | 'quota_alert' | 'service_status' | 'system_alert';
  title: string;
  content: string;
  priority: 'low' | 'normal' | 'high' | 'critical';
  timestamp: Date;
  data?: any; // Additional data specific to the notification type
  recipients?: string[]; // User IDs or email addresses
  channels?: ('email' | 'webhook' | 'websocket' | 'push')[];
}

export interface NotificationConfig {
  email?: EmailNotificationConfig;
  webhook?: WebhookNotificationConfig;
  websocket?: WebsocketNotificationConfig;
  push?: PushNotificationConfig;
}

export interface EmailNotificationConfig {
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPassword: string;
  from: string;
  to: string[];
}

export interface WebhookNotificationConfig {
  url: string;
  headers?: Record<string, string>;
  method?: 'POST' | 'GET' | 'PUT';
}

export interface WebsocketNotificationConfig {
  enabled: boolean;
  // WebSocket server connection details would be configured in the main app
}

export interface PushNotificationConfig {
  service: 'firebase' | 'onesignal' | 'apns';
  apiKey: string;
  appId?: string;
}

export class NotificationManager {
  private channels: Map<string, NotificationChannel> = new Map();
  private queue: NotificationMessage[] = [];
  private isProcessing: boolean = false;
  private defaultChannels: ('email' | 'webhook' | 'websocket' | 'push')[] = ['email'];
  
  constructor(private config: NotificationConfig) {
    this.initializeChannels();
  }

  private initializeChannels(): void {
    // Initialize email notification channel if configured
    if (this.config.email) {
      const emailChannel = new EmailNotificationChannel(this.config.email);
      this.channels.set('email', emailChannel);
    }

    // Initialize webhook notification channel if configured
    if (this.config.webhook) {
      const webhookChannel = new WebhookNotificationChannel(this.config.webhook);
      this.channels.set('webhook', webhookChannel);
    }

    // WebSocket and push notifications would be initialized if configured
    // These typically require server-side connections
  }

  async sendNotification(message: NotificationMessage): Promise<boolean> {
    const channelsToUse = message.channels || this.defaultChannels;
    let success = false;

    for (const channelType of channelsToUse) {
      const channel = this.channels.get(channelType);
      if (channel) {
        try {
          const result = await channel.send(message);
          if (result) {
            success = true;
          }
        } catch (error) {
          console.error(`Failed to send notification via ${channelType}:`, error);
        }
      }
    }

    return success;
  }

  async queueNotification(message: Omit<NotificationMessage, 'id' | 'timestamp'>): Promise<string> {
    const notification: NotificationMessage = {
      ...message,
      id: `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date()
    };

    this.queue.push(notification);
    this.processQueue(); // Process immediately since it's a simple implementation

    return notification.id;
  }

  async processQueue(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.queue.length > 0) {
      const message = this.queue.shift()!;
      await this.sendNotification(message);
    }

    this.isProcessing = false;
  }

  async requestManualCaptchaSolve(task: CaptchaTask, captchaImage?: string): Promise<boolean> {
    const message: NotificationMessage = {
      id: `captcha_${task.id}`,
      type: 'captcha_solving',
      title: 'Manual CAPTCHA Solving Required',
      content: `Automated CAPTCHA solving failed for task ${task.id}. Please solve the CAPTCHA manually.`,
      priority: 'high',
      timestamp: new Date(),
      data: {
        taskId: task.id,
        taskType: task.type,
        pageUrl: task.pageUrl,
        captchaImage: captchaImage,
        siteKey: task.siteKey,
        question: task.question
      },
      channels: ['email', 'webhook']
    };

    return await this.queueNotification(message);
  }

  async sendTaskCompletionNotification(taskId: string, success: boolean, details?: any): Promise<boolean> {
    const message: NotificationMessage = {
      id: `task_${taskId}`,
      type: success ? 'task_completed' : 'task_failed',
      title: success ? 'Task Completed Successfully' : 'Task Failed',
      content: `Task ${taskId} has ${success ? 'completed successfully' : 'failed'}.`,
      priority: success ? 'normal' : 'high',
      timestamp: new Date(),
      data: details
    };

    return await this.sendNotification(message);
  }

  async sendQuotaAlert(serviceName: string, usagePercentage: number, quotaDetails?: any): Promise<boolean> {
    const priority: 'normal' | 'high' | 'critical' = usagePercentage > 90 ? 'critical' : usagePercentage > 75 ? 'high' : 'normal';

    const message: NotificationMessage = {
      id: `quota_${Date.now()}_${serviceName}`,
      type: 'quota_alert',
      title: 'Quota Alert',
      content: `${serviceName} is at ${usagePercentage}% of its quota.`,
      priority,
      timestamp: new Date(),
      data: quotaDetails
    };

    return await this.sendNotification(message);
  }

  getQueueLength(): number {
    return this.queue.length;
  }

  async getRecentNotifications(limit: number = 10): Promise<NotificationMessage[]> {
    return this.queue.slice(-limit);
  }

  async clearQueue(): Promise<void> {
    this.queue.length = 0;
  }
}

// Email Notification Channel Implementation
class EmailNotificationChannel implements NotificationChannel {
  constructor(private config: EmailNotificationConfig) {}

  async send(message: NotificationMessage): Promise<boolean> {
    // In a real implementation, this would use nodemailer or similar
    console.log(`Email notification: ${message.title} - ${message.content}`);
    
    // Mock email sending
    try {
      // Using nodemailer or similar in real implementation
      console.log(`Sending email to: ${this.config.to.join(', ')}`);
      console.log(`Subject: ${message.title}`);
      console.log(`Content: ${message.content}`);
      
      // For now, just return true to simulate success
      return true;
    } catch (error) {
      console.error('Email sending failed:', error);
      return false;
    }
  }

  validateConfig(): boolean {
    return !!(this.config.smtpHost && this.config.smtpUser && this.config.smtpPassword && this.config.from);
  }
}

// Webhook Notification Channel Implementation
class WebhookNotificationChannel implements NotificationChannel {
  constructor(private config: WebhookNotificationConfig) {}

  async send(message: NotificationMessage): Promise<boolean> {
    try {
      const response = await fetch(this.config.url, {
        method: this.config.method || 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.config.headers
        },
        body: JSON.stringify(message)
      });

      return response.ok;
    } catch (error) {
      console.error('Webhook sending failed:', error);
      return false;
    }
  }

  validateConfig(): boolean {
    return !!(this.config.url);
  }
}

// WebSocket Notification Channel Implementation
class WebsocketNotificationChannel implements NotificationChannel {
  constructor(private config: WebsocketNotificationConfig) {}

  async send(message: NotificationMessage): Promise<boolean> {
    // In a real implementation, this would send via WebSocket
    console.log(`WebSocket notification: ${message.title}`);
    // For now, return true to simulate success
    return true;
  }

  validateConfig(): boolean {
    return this.config.enabled === true;
  }
}

// Push Notification Channel Implementation
class PushNotificationChannel implements NotificationChannel {
  constructor(private config: PushNotificationConfig) {}

  async send(message: NotificationMessage): Promise<boolean> {
    // In a real implementation, this would use Firebase, OneSignal, etc.
    console.log(`Push notification: ${message.title}`);
    // For now, return true to simulate success
    return true;
  }

  validateConfig(): boolean {
    return !!(this.config.apiKey);
  }
}