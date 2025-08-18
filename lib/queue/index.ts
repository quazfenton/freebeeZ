import Queue, { Job } from 'bull';
import { AutomationTask } from '../browser-automation';

export interface AutomationJobData {
  task: AutomationTask;
}

export class QueueService {
  private automationQueue: Queue.Queue<AutomationJobData>;

  constructor(redisUrl: string) {
    this.automationQueue = new Queue('automationQueue', redisUrl);
  }

  async addAutomationTask(task: AutomationTask): Promise<Job<AutomationJobData>> {
    return this.automationQueue.add({ task });
  }

  getQueue(): Queue.Queue<AutomationJobData> {
    return this.automationQueue;
  }

  async close(): Promise<void> {
    await this.automationQueue.close();
  }
}
