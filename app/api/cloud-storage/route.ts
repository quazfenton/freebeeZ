import { NextRequest } from 'next/server';
import { CloudStorageAggregator, UnifiedFile } from '@/lib/cloud-storage-aggregator';
import { DropboxProvider } from '@/lib/cloud-storage-aggregator/providers/dropbox';
import { GoogleDriveProvider } from '@/lib/cloud-storage-aggregator/providers/google-drive';
import { MEGAProvider } from '@/lib/cloud-storage-aggregator/providers/mega';

// Initialize the cloud storage aggregator
let aggregator: CloudStorageAggregator | null = null;

function getAggregator(): CloudStorageAggregator {
  if (!aggregator) {
    aggregator = new CloudStorageAggregator();
    
    // In a real implementation, you would load tokens from secure storage
    // For this example, we'll use environment variables
    const dropboxToken = process.env.DROPBOX_TOKEN;
    const googleDriveToken = process.env.GOOGLE_DRIVE_TOKEN;
    const megaSID = process.env.MEGA_SID;
    
    if (dropboxToken) {
      aggregator.addProvider('dropbox', new DropboxProvider(dropboxToken));
    }
    
    if (googleDriveToken) {
      aggregator.addProvider('googledrive', new GoogleDriveProvider(googleDriveToken));
    }
    
    if (megaSID) {
      aggregator.addProvider('mega', new MEGAProvider(megaSID));
    }
  }
  
  return aggregator;
}

// Helper function to validate request origin for security
function isValidRequest(request: NextRequest): boolean {
  // In a real implementation, you'd have more robust validation
  return true;
}

export async function GET(request: NextRequest) {
  try {
    if (!isValidRequest(request)) {
      return Response.json({ 
        success: false, 
        error: 'Invalid request' 
      }, { status: 400 });
    }

    const url = new URL(request.url);
    const action = url.searchParams.get('action');
    const aggregator = getAggregator();

    switch (action) {
      case 'quota': {
        const quotas = await aggregator.getAggregateQuota();
        return Response.json({ success: true, quotas });
      }
      
      case 'files': {
        const searchQuery = url.searchParams.get('search') || '';
        let files: UnifiedFile[] = [];
        
        if (searchQuery) {
          // Search across all providers
          files = await aggregator.searchFiles(searchQuery);
        } else {
          // List all files across providers
          files = await aggregator.listAllFiles();
        }
        
        return Response.json({ success: true, files });
      }
      
      case 'rebalance-status': {
        // Return information about rebalancing status
        const quotas = await aggregator.getAggregateQuota();
        const providersNeedingRebalance = Object.entries(quotas).filter(
          ([_, quota]) => (quota.used / quota.total) > 0.8 // 80% threshold
        ).map(([name]) => name);
        
        return Response.json({ 
          success: true, 
          providersNeedingRebalance,
          quotas
        });
      }
      
      default:
        return Response.json({ 
          success: false, 
          error: 'Invalid action. Use ?action=quota, ?action=files, or ?action=rebalance-status' 
        }, { status: 400 });
    }
  } catch (error) {
    console.error('Cloud storage API GET error:', error);
    return Response.json({ 
      success: false, 
      error: (error as Error).message 
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!isValidRequest(request)) {
      return Response.json({ 
        success: false, 
        error: 'Invalid request' 
      }, { status: 400 });
    }

    const url = new URL(request.url);
    const action = url.searchParams.get('action');
    const aggregator = getAggregator();
    
    if (!action) {
      return Response.json({ 
        success: false, 
        error: 'Action parameter is required' 
      }, { status: 400 });
    }

    switch (action) {
      case 'upload': {
        // For the upload action, we need to handle form data
        const formData = await request.formData();
        const file = formData.get('file') as File | null;
        const filename = formData.get('filename') as string;
        const provider = formData.get('provider') as string;

        if (!file) {
          return Response.json({ 
            success: false, 
            error: 'File is required' 
          }, { status: 400 });
        }

        // Convert File to Buffer
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const result = await aggregator.uploadFile(
          buffer, 
          filename || file.name, 
          file.type,
          provider || undefined
        );

        return Response.json({ success: true, result });
      }
      
      case 'backup-file': {
        const { fileId, fromProvider, toProviders } = await request.json();
        
        if (!fileId || !fromProvider || !toProviders || !Array.isArray(toProviders)) {
          return Response.json({ 
            success: false, 
            error: 'fileId, fromProvider, and toProviders (array) are required' 
          }, { status: 400 });
        }

        // Download from original provider
        const fileContent = await aggregator['downloadFile'](fileId, fromProvider);
        if (!fileContent) {
          return Response.json({ 
            success: false, 
            error: 'Could not download source file' 
          }, { status: 404 });
        }

        // Get file metadata to preserve name
        const providerInstance = aggregator['getProvider'](fromProvider);
        if (!providerInstance) {
          return Response.json({ 
            success: false, 
            error: `Source provider ${fromProvider} not found` 
          }, { status: 404 });
        }

        const fileMetadata = await providerInstance['getFileMetadata'](fileId);
        if (!fileMetadata) {
          return Response.json({ 
            success: false, 
            error: 'Could not get file metadata' 
          }, { status: 404 });
        }

        // Upload to each backup provider
        const results = [];
        for (const backupProvider of toProviders) {
          try {
            const uploadResult = await aggregator.uploadFile(
              fileContent, 
              fileMetadata.name, 
              fileMetadata.mimeType, 
              backupProvider
            );
            results.push({
              provider: backupProvider,
              success: uploadResult.success,
              fileId: uploadResult.fileId
            });
          } catch (error) {
            results.push({
              provider: backupProvider,
              success: false,
              error: (error as Error).message
            });
          }
        }

        return Response.json({ 
          success: true, 
          message: 'Backup operation completed',
          fileId,
          results 
        });
      }
      
      case 'rebalance': {
        const results = await aggregator.rebalanceStorage();
        return Response.json({ 
          success: true, 
          message: 'Rebalancing completed',
          results 
        });
      }
      
      case 'search': {
        const { query } = await request.json();
        
        if (!query) {
          return Response.json({ 
            success: false, 
            error: 'Search query is required' 
          }, { status: 400 });
        }

        const files = await aggregator.searchFiles(query);
        return Response.json({ 
          success: true, 
          files 
        });
      }
      
      default:
        return Response.json({ 
          success: false, 
          error: 'Invalid action' 
        }, { status: 400 });
    }
  } catch (error) {
    console.error('Cloud storage POST API error:', error);
    return Response.json({ 
      success: false, 
      error: (error as Error).message 
    }, { status: 500 });
  }
}