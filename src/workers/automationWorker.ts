import { Worker } from 'bull';
import { QueueService, AutomationJobData } from '../lib/queue';
import { BrowserAutomationEngine } from '../lib/browser-automation';
import winston from 'winston';

// Configure Winston logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    // Add other transports like file or daily rotate file for production
  ],
});

// Initialize BrowserAutomationEngine
const browserAutomationEngine = new BrowserAutomationEngine();

// TODO: Replace with actual Redis URL from configuration
const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

// Initialize QueueService (for adding jobs, not processing here)
const queueService = new QueueService(redisUrl);

// Create a Bull Worker to process jobs
const automationWorker = new Worker<AutomationJobData>('automationQueue', async (job) => {
  logger.info(`Processing automation job ${job.id}: ${job.data.task.name}`);
  try {
    const result = await browserAutomationEngine.executeTask(job.data.task);
    logger.info(`Automation job ${job.id} finished with success: ${result.success}`);
    return result; // Return the result for successful jobs
  } catch (error: any) {
    logger.error(`Error processing automation job ${job.id}:`, error);
    throw error; // Re-throw to mark job as failed
  }
}, {
  connection: redisUrl, // Specify Redis connection for the worker
});

automationWorker.on('completed', (job) => {
  logger.info(`Job ${job.id} completed.`);
});

automationWorker.on('failed', (job, err) => {
  logger.error(`Job ${job.id} failed with error: ${err.message}`);
});

automationWorker.on('error', (err) => {
  logger.error('Worker error:', err);
});

logger.info('Automation worker started. Waiting for jobs...');

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('SIGINT received. Closing worker...');
  await automationWorker.close();
  await queueService.close();
  logger.info('Automation worker stopped.');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('SIGTERM received. Closing worker...');
  await automationWorker.close();
  await queueService.close();
  logger.info('Automation worker stopped.');
  process.exit(0);
});
