import { Queue, Worker, Job } from 'bullmq';
import { AutomationTask } from '../browser-automation';

export interface AutomationJobData {
  task: AutomationTask;
}

export class QueueService {
  private automationQueue: Queue<AutomationJobData>;
  private worker: Worker<AutomationJobData> | null = null;

  constructor(redisUrl: string) {
    // Extract Redis connection options from the URL
    const url = new URL(redisUrl);
    const connection = {
      host: url.hostname,
      port: parseInt(url.port, 10) || 6379,
      password: url.password || undefined,
    };

    this.automationQueue = new Queue<AutomationJobData>('automationQueue', { connection });
  }

  async addAutomationTask(task: AutomationTask): Promise<Job<AutomationJobData>> {
    return this.automationQueue.add('automation-job', { task });
  }

  getQueue(): Queue<AutomationJobData> {
    return this.automationQueue;
  }

  async close(): Promise<void> {
    if (this.worker) {
      await this.worker.close();
    }
    await this.automationQueue.close();
  }
}
