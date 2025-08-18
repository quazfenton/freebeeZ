import { ServiceIntegration, ServiceConfig, BaseServiceIntegration } from '../service-integrations';
import { FreeEmailService } from '../service-integrations/free-email-service';
import { FreeFileStorageService } from '../service-integrations/free-file-storage-service';
import { GitHubService, NetlifyService, VercelService, RailwayService } from '../service-integrations/advanced-services';
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
  ],
});

export class ServiceRegistry {
  private services: Map<string, ServiceIntegration> = new Map();

  constructor() {
    // Register known services
    // In a real application, these would be loaded from a configuration or database
    this.registerServiceType('FreeEmailService', FreeEmailService);
    this.registerServiceType('FreeFileStorageService', FreeFileStorageService);
    this.registerServiceType('GitHubService', GitHubService);
    this.registerServiceType('NetlifyService', NetlifyService);
    this.registerServiceType('VercelService', VercelService);
    this.registerServiceType('RailwayService', RailwayService);
  }

  private serviceConstructors: Map<string, new (config: ServiceConfig) => ServiceIntegration> = new Map();

  public registerServiceType(type: string, constructor: new (config: ServiceConfig) => ServiceIntegration): void {
    this.serviceConstructors.set(type, constructor);
    logger.info(`Registered service type: ${type}`);
  }

  public createService(type: string, config: ServiceConfig): ServiceIntegration {
    const ServiceConstructor = this.serviceConstructors.get(type);
    if (!ServiceConstructor) {
      logger.error(`Attempted to create unregistered service type: ${type}`);
      throw new Error(`Service type ${type} is not registered.`);
    }
    const service = new ServiceConstructor(config);
    this.services.set(service.id, service);
    logger.info(`Created service: ${service.name} (ID: ${service.id}, Type: ${type})`);
    return service;
  }

  public getService(id: string): ServiceIntegration | undefined {
    const service = this.services.get(id);
    if (!service) {
      logger.warn(`Attempted to retrieve non-existent service with ID: ${id}`);
    }
    return service;
  }

  public getAllServices(): ServiceIntegration[] {
    return Array.from(this.services.values());
  }

  public async initializeServices(serviceConfigs: ServiceConfig[]): Promise<void> {
    for (const config of serviceConfigs) {
      try {
        const service = this.createService(config.name, config); // Assuming config.name matches registered type
        // Optionally connect services on initialization if they are marked as active
        if (config.isActive && service.connect) {
          await service.connect(config.credentials);
          logger.info(`Initialized and connected service: ${service.name}`);
        }
      } catch (error) {
        logger.error(`Failed to initialize service ${config.name}:`, error);
      }
    }
  }

  public async shutdownServices(): Promise<void> {
    for (const service of this.services.values()) {
      if (service.isConnected() && service.disconnect) {
        try {
          await service.disconnect();
          logger.info(`Disconnected service: ${service.name}`);
        } catch (error) {
          logger.error(`Error disconnecting service ${service.name}:`, error);
        }
      }
    }
    this.services.clear();
    logger.info('All services shut down.');
  }
}