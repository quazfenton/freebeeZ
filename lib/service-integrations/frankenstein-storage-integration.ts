import { ServiceIntegration } from './types';
import { CloudStorageServiceIntegration } from '../cloud-storage-aggregator/cloud-storage-service';

/**
 * Frankenstein Cloud Storage Service Integration
 * Integrates the multi-provider cloud storage aggregator with the FreebeeZ orchestrator
 */
export class FrankensteinStorageIntegration implements ServiceIntegration {
  private cloudStorageIntegration: CloudStorageServiceIntegration;

  constructor() {
    this.cloudStorageIntegration = new CloudStorageServiceIntegration();
  }

  async initialize(): Promise<void> {
    return await this.cloudStorageIntegration.initialize();
  }

  async connect(credentials: any): Promise<boolean> {
    return await this.cloudStorageIntegration.connect(credentials);
  }

  async disconnect(): Promise<boolean> {
    return await this.cloudStorageIntegration.disconnect();
  }

  async getStatus(): Promise<any> {
    return await this.cloudStorageIntegration.getStatus();
  }

  async performAction(actionName: string, params: any): Promise<any> {
    return await this.cloudStorageIntegration.performAction(actionName, params);
  }

  /**
   * Get the service template for the Frankenstein Cloud Storage service
   */
  getServiceTemplate(): any {
    return CloudStorageServiceIntegration.getServiceTemplate();
  }

  /**
   * Perform Frankenstein-specific actions
   */
  async aggregateStorage(): Promise<any> {
    // Get status which includes aggregated storage data
    return await this.getStatus();
  }

  async rebalanceStorage(): Promise<{ providers: any[], moves: any[] }> {
    const result = await this.performAction('rebalanceStorage', {});
    return {
      providers: result.providers || [],
      moves: result.moves || []
    };
  }

  async backupFileToProviders(fileId: string, providers: string[]): Promise<any> {
    return await this.performAction('backupFile', {
      fileId,
      providers
    });
  }

  async unifiedSearch(query: string): Promise<any> {
    return await this.performAction('searchFiles', { query });
  }
}

/**
 * Factory function to create the Frankenstein Storage Integration
 */
export function createFrankensteinStorageIntegration(): FrankensteinStorageIntegration {
  return new FrankensteinStorageIntegration();
}