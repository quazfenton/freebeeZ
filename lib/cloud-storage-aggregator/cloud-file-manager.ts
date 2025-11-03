import { CloudStorageAggregator, UnifiedFile } from './index';
import { FileMetadata } from './types';

/**
 * Manages unified file operations across all storage providers
 */
export class CloudFileManager {
  constructor(private aggregator: CloudStorageAggregator) {}

  /**
   * Get unified file listing across all providers
   */
  async getAllFiles(): Promise<UnifiedFile[]> {
    const allFiles: UnifiedFile[] = [];
    const providerFiles: Map<string, UnifiedFile> = new Map();

    const providers = this.aggregator.getAllProviders();
    for (const [providerName, provider] of providers) {
      try {
        const files = await provider.listFiles();
        for (const file of files) {
          // Create a unique key based on file characteristics to identify duplicates
          const key = `${file.name}-${file.size}-${file.modified.getTime()}`;
          
          if (!providerFiles.has(key)) {
            // Create new unified file
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
            // File already exists in another provider, add this provider to it
            const unifiedFile = providerFiles.get(key)!;
            if (!unifiedFile.providers.includes(providerName)) {
              unifiedFile.providers.push(providerName);
              unifiedFile.locations[providerName] = file.id;
            }
          }
        }
      } catch (error) {
        console.error(`Failed to list files from ${providerName}:`, error);
      }
    }

    return Array.from(providerFiles.values());
  }

  /**
   * Get a unified view of a specific file across all providers
   */
  async getUnifiedFile(filename: string): Promise<UnifiedFile | null> {
    const allFiles = await this.getAllFiles();
    const file = allFiles.find(f => f.name === filename);
    return file || null;
  }

  /**
   * Create a backup of a file across multiple providers
   */
  async createFileBackup(
    originalFileId: string,
    originalProvider: string,
    backupProviders: string[]
  ): Promise<boolean> {
    try {
      // Download the original file
      const fileContent = await this.aggregator.downloadFile(originalFileId, originalProvider);
      if (!fileContent) {
        console.error('Could not download original file for backup');
        return false;
      }

      // Get original file metadata
      const originalProviderInstance = this.aggregator.getProvider(originalProvider);
      if (!originalProviderInstance) {
        console.error(`Original provider ${originalProvider} not found`);
        return false;
      }

      const originalMetadata = await originalProviderInstance.getFileMetadata(originalFileId);
      if (!originalMetadata) {
        console.error('Could not get original file metadata');
        return false;
      }

      // Upload to backup providers
      for (const providerName of backupProviders) {
        try {
          await this.aggregator.uploadFile(fileContent, originalMetadata.name, originalMetadata.mimeType, providerName);
        } catch (error) {
          console.error(`Backup failed to ${providerName}:`, error);
          // Continue with other providers even if one fails
        }
      }

      return true;
    } catch (error) {
      console.error('File backup creation failed:', error);
      return false;
    }
  }

  /**
   * Perform intelligent backup based on space constraints
   */
  async performIntelligentBackup(
    file: Buffer | string,
    filename: string,
    preferredProvider?: string
  ): Promise<{
    success: boolean;
    primaryProvider: string;
    backupProviders: string[];
    files: { provider: string; fileId: string }[];
  }> {
    const result = {
      success: false,
      primaryProvider: '',
      backupProviders: [] as string[],
      files: [] as { provider: string; fileId: string }[]
    };

    try {
      // Upload to primary provider
      const primaryResult = await this.aggregator.uploadFile(file, filename, undefined, preferredProvider);
      result.primaryProvider = primaryResult.provider;
      result.files.push({
        provider: primaryResult.provider,
        fileId: primaryResult.fileId
      });

      if (!primaryResult.success) {
        return result;
      }

      // Get storage quotas to determine where to backup
      const quotas = await this.aggregator.getAggregateQuota();
      const availableProviders = Object.entries(quotas)
        .filter(([provider, quota]) => 
          provider !== primaryResult.provider && quota.available > Buffer.isBuffer(file) ? file.length : 1024
        )
        .map(([provider]) => provider);

      // Perform backup to available providers (up to 2 additional locations)
      const backupProviders = availableProviders.slice(0, 2);
      result.backupProviders = backupProviders;

      for (const provider of backupProviders) {
        try {
          const backupResult = await this.aggregator.uploadFile(file, filename, undefined, provider);
          if (backupResult.success) {
            result.files.push({
              provider: backupResult.provider,
              fileId: backupResult.fileId
            });
          }
        } catch (error) {
          console.error(`Backup to ${provider} failed:`, error);
        }
      }

      result.success = true;
      return result;
    } catch (error) {
      console.error('Intelligent backup failed:', error);
      return result;
    }
  }

  /**
   * Find duplicate files across providers
   */
  async findDuplicates(): Promise<Array<{ name: string; size: number; providers: string[]; locations: { [provider: string]: string[] } }>> {
    const duplicates: Array<{ name: string; size: number; providers: string[]; locations: { [provider: string]: string[] } }> = [];
    const fileMap: Map<string, { providers: string[]; locations: { [provider: string]: string[] } }> = new Map();

    const providers = this.aggregator.getAllProviders();
    for (const [providerName, provider] of providers) {
      try {
        const files = await provider.listFiles();
        for (const file of files) {
          const key = `${file.name}-${file.size}`;
          if (!fileMap.has(key)) {
            fileMap.set(key, {
              providers: [providerName],
              locations: { [providerName]: [file.id] }
            });
          } else {
            const existing = fileMap.get(key)!;
            if (!existing.providers.includes(providerName)) {
              existing.providers.push(providerName);
            }
            if (!existing.locations[providerName]) {
              existing.locations[providerName] = [];
            }
            existing.locations[providerName].push(file.id);
          }
        }
      } catch (error) {
        console.error(`Failed to list files from ${providerName}:`, error);
      }
    }

    // Extract files that exist in multiple providers
    for (const [key, data] of fileMap) {
      if (data.providers.length > 1) {
        const [name, sizeStr] = key.split('-');
        const size = parseInt(sizeStr, 10);
        duplicates.push({ name, size, providers: data.providers, locations: data.locations });
      }
    }

    return duplicates;
  }

  /**
   * Cleanup duplicate files, keeping only on primary provider
   */
  async cleanupDuplicates(primaryProvider: string, keepOriginal: boolean = true): Promise<{ deleted: number; errors: number }> {
    const result = { deleted: 0, errors: 0 };
    const duplicates = await this.findDuplicates();

    for (const dup of duplicates) {
      // Find duplicate files that are NOT on the primary provider
      for (const provider of dup.providers) {
        if (provider !== primaryProvider) {
          const providerInstance = this.aggregator.getProvider(provider);
          if (!providerInstance) continue;

          // Delete all file instances on non-primary providers
          for (const fileId of dup.locations[provider]) {
            try {
              const success = await providerInstance.deleteFile(fileId);
              if (success) result.deleted++;
            } catch (error) {
              console.error(`Failed to delete ${fileId} from ${provider}:`, error);
              result.errors++;
            }
          }
        }
      }
    }

    return result;
  }
}