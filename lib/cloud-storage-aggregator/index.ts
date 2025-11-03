import { StorageProvider, FileMetadata } from './types';
import { DropboxProvider } from './providers/dropbox';
import { GoogleDriveProvider } from './providers/google-drive';
import { MEGAProvider } from './providers/mega';
import { CloudFileManager } from './cloud-file-manager';

export { 
  StorageProvider, 
  FileMetadata, 
  CloudFileManager,
  DropboxProvider,
  GoogleDriveProvider,
  MEGAProvider 
};

export interface StorageQuota {
  used: number;
  total: number;
  available: number;
}

export interface UnifiedFile {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  modified: Date;
  providers: string[]; // List of providers where this file is stored
  locations: { [provider: string]: string }; // provider -> file_id mapping
}

/**
 * Main class for the Frankenstein Cloud Storage Aggregator
 * Unifies multiple cloud storage services with unified search, backup, and rotation
 */
export class CloudStorageAggregator {
  private providers: Map<string, StorageProvider> = new Map();
  private fileManager: CloudFileManager;
  private defaultProvider: string | null = null;

  constructor() {
    this.fileManager = new CloudFileManager(this);
  }

  /**
   * Register a storage provider
   */
  addProvider(name: string, provider: StorageProvider): void {
    this.providers.set(name, provider);
    if (!this.defaultProvider) {
      this.defaultProvider = name;
    }
  }

  /**
   * Get a registered storage provider
   */
  getProvider(name: string): StorageProvider | undefined {
    return this.providers.get(name);
  }

  /**
   * Get all registered providers
   */
  getAllProviders(): Map<string, StorageProvider> {
    return this.providers;
  }

  /**
   * Get storage quota information across all providers
   */
  async getAggregateQuota(): Promise<{ [provider: string]: StorageQuota }> {
    const quotas: { [provider: string]: StorageQuota } = {};
    
    for (const [name, provider] of this.providers) {
      try {
        quotas[name] = await provider.getQuota();
      } catch (error) {
        console.error(`Error getting quota for ${name}:`, error);
        quotas[name] = { used: 0, total: 0, available: 0 };
      }
    }
    
    return quotas;
  }

  /**
   * Upload a file with automatic provider selection based on available space
   */
  async uploadFile(
    file: Buffer | string, 
    filename: string, 
    mimeType?: string,
    preferredProvider?: string
  ): Promise<{
    success: boolean;
    provider: string;
    fileId: string;
    url?: string;
  }> {
    // Select provider based on available space or preference
    let providerName = preferredProvider;
    if (!providerName || !this.providers.has(providerName)) {
      providerName = await this.selectBestProviderForUpload();
    }
    
    if (!providerName) {
      throw new Error('No available providers for upload');
    }
    
    const provider = this.providers.get(providerName);
    if (!provider) {
      throw new Error(`Provider ${providerName} not found`);
    }
    
    try {
      const result = await provider.uploadFile(file, filename, mimeType);
      return {
        success: result.success,
        provider: providerName,
        fileId: result.fileId,
        url: result.url
      };
    } catch (error) {
      console.error(`Upload failed on ${providerName}:`, error);
      // Try next available provider
      return await this.uploadFile(file, filename, mimeType, await this.selectNextBestProvider(providerName));
    }
  }

  /**
   * Download a file from any provider
   */
  async downloadFile(fileId: string, providerName: string): Promise<Buffer | null> {
    const provider = this.providers.get(providerName);
    if (!provider) {
      throw new Error(`Provider ${providerName} not found`);
    }
    
    return await provider.downloadFile(fileId);
  }

  /**
   * Search for files across all providers
   */
  async searchFiles(query: string): Promise<UnifiedFile[]> {
    const allFiles: UnifiedFile[] = [];
    const providerFiles: Map<string, UnifiedFile> = new Map();

    // Search across all providers
    for (const [providerName, provider] of this.providers) {
      try {
        const files = await provider.searchFiles(query);
        for (const file of files) {
          const key = `${file.name}-${file.size}-${file.modified.getTime()}`;
          
          if (!providerFiles.has(key)) {
            const unifiedFile: UnifiedFile = {
              id: `${providerName}:${file.id}`,
              name: file.name,
              size: file.size,
              mimeType: file.mimeType,
              modified: file.modified,
              providers: [providerName],
              locations: { [providerName]: file.id }
            };
            providerFiles.set(key, unifiedFile);
          } else {
            // Add this provider to the existing unified file
            const unifiedFile = providerFiles.get(key)!;
            if (!unifiedFile.providers.includes(providerName)) {
              unifiedFile.providers.push(providerName);
              unifiedFile.locations[providerName] = file.id;
            }
          }
        }
      } catch (error) {
        console.error(`Search failed on ${providerName}:`, error);
      }
    }

    return Array.from(providerFiles.values());
  }

  /**
   * Backup file to multiple providers with rotation strategy
   */
  async backupFileToMultipleProviders(
    file: Buffer | string,
    filename: string,
    providers: string[],
    strategy: 'all' | 'rotate' | 'space-based' = 'space-based'
  ): Promise<Array<{ provider: string; success: boolean; fileId?: string; error?: string }>> {
    const results: Array<{ provider: string; success: boolean; fileId?: string; error?: string }> = [];

    for (const providerName of providers) {
      if (!this.providers.has(providerName)) {
        results.push({
          provider: providerName,
          success: false,
          error: 'Provider not registered'
        });
        continue;
      }

      try {
        const result = await this.uploadFile(file, filename, undefined, providerName);
        results.push({
          provider: providerName,
          success: result.success,
          fileId: result.fileId
        });
      } catch (error) {
        results.push({
          provider: providerName,
          success: false,
          error: (error as Error).message
        });
      }
    }

    return results;
  }

  /**
   * Get the best provider for upload based on available space
   */
  private async selectBestProviderForUpload(): Promise<string | null> {
    const quotas = await this.getAggregateQuota();
    let bestProvider: string | null = null;
    let maxAvailableSpace = 0;

    for (const [providerName, quota] of Object.entries(quotas)) {
      if (quota.available > maxAvailableSpace) {
        maxAvailableSpace = quota.available;
        bestProvider = providerName;
      }
    }

    return bestProvider;
  }

  /**
   * Get the next best provider excluding one provider
   */
  private async selectNextBestProvider(excludeProvider: string): Promise<string | null> {
    const quotas = await this.getAggregateQuota();
    let bestProvider: string | null = null;
    let maxAvailableSpace = 0;

    for (const [providerName, quota] of Object.entries(quotas)) {
      if (providerName !== excludeProvider && quota.available > maxAvailableSpace) {
        maxAvailableSpace = quota.available;
        bestProvider = providerName;
      }
    }

    return bestProvider;
  }

  /**
   * Move file from one provider to another (useful when space runs low)
   */
  async moveFile(
    fileId: string, 
    fromProvider: string, 
    toProvider?: string
  ): Promise<{ success: boolean; newFileId?: string; error?: string }> {
    try {
      // Download file from source provider
      const fileContent = await this.downloadFile(fileId, fromProvider);
      if (!fileContent) {
        return { success: false, error: 'Failed to download file from source provider' };
      }

      // Get the file metadata to preserve name
      const sourceProvider = this.providers.get(fromProvider);
      if (!sourceProvider) {
        return { success: false, error: 'Source provider not found' };
      }

      const fileMetadata = await sourceProvider.getFileMetadata(fileId);
      if (!fileMetadata) {
        return { success: false, error: 'Could not get file metadata' };
      }

      // Upload to destination provider
      const destinationProvider = toProvider || await this.selectBestProviderForUpload();
      if (!destinationProvider) {
        return { success: false, error: 'No available providers for upload' };
      }

      const uploadResult = await this.uploadFile(
        fileContent, 
        fileMetadata.name, 
        fileMetadata.mimeType, 
        destinationProvider
      );

      if (!uploadResult.success) {
        return { success: false, error: 'Failed to upload to destination provider' };
      }

      // Delete the original file
      await sourceProvider.deleteFile(fileId);

      return { success: true, newFileId: uploadResult.fileId };
    } catch (error) {
      return { 
        success: false, 
        error: `Move operation failed: ${(error as Error).message}` 
      };
    }
  }

  /**
   * Get unified file listing across all providers
   */
  async listAllFiles(): Promise<UnifiedFile[]> {
    return await this.fileManager.getAllFiles();
  }

  /**
   * Synchronize space usage across providers based on limits
   */
  async rebalanceStorage(): Promise<{ provider: string; action: string; result: any }[]> {
    const results: { provider: string; action: string; result: any }[] = [];
    const quotas = await this.getAggregateQuota();

    // Find providers that are over or approaching limits
    for (const [providerName, quota] of Object.entries(quotas)) {
      const usagePercentage = quota.used / quota.total;
      
      if (usagePercentage > 0.9) { // If over 90% capacity
        // Find files to move to other providers
        results.push({
          provider: providerName,
          action: 'rebalance',
          result: await this.rebalanceProvider(providerName)
        });
      }
    }

    return results;
  }

  /**
   * Rebalance a specific provider's storage by moving files
   */
  private async rebalanceProvider(providerName: string): Promise<any> {
    const provider = this.providers.get(providerName);
    if (!provider) {
      return { success: false, error: 'Provider not found' };
    }

    // Get files from the overloaded provider
    const files = await provider.listFiles();
    
    // Sort by size (largest first)
    files.sort((a, b) => b.size - a.size);
    
    // Move the largest files to the provider with most available space
    const destination = await this.selectBestProviderForUpload();
    if (!destination || destination === providerName) {
      return { success: false, error: 'No suitable destination provider found' };
    }

    const destinationProvider = this.providers.get(destination);
    if (!destinationProvider) {
      return { success: false, error: 'Destination provider not found' };
    }

    const results: any[] = [];
    for (const file of files) {
      if (results.length >= 5) break; // Only move first 5 files to avoid overwhelming

      // Calculate if moving this file would overburden destination
      const destinationQuota = await destinationProvider.getQuota();
      if (destinationQuota.available < file.size) {
        continue; // Skip if destination doesn't have space
      }

      const moveResult = await this.moveFile(file.id, providerName, destination);
      results.push({ fileId: file.id, result: moveResult });
    }

    return { success: true, filesMoved: results };
  }
}