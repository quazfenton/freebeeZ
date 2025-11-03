import { NextRequest } from 'next/server';
import { CloudStorageAggregator } from '@/lib/cloud-storage-aggregator';
import { DropboxProvider } from '@/lib/cloud-storage-aggregator/providers/dropbox';
import { GoogleDriveProvider } from '@/lib/cloud-storage-aggregator/providers/google-drive';
import { MEGAProvider } from '@/lib/cloud-storage-aggregator/providers/mega';

// Initialize the cloud storage aggregator
let aggregator: CloudStorageAggregator | null = null;

function getAggregator(): CloudStorageAggregator {
  if (!aggregator) {
    aggregator = new CloudStorageAggregator();
    
    // In a real implementation, you would load tokens from secure storage
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
    const pathParts = url.pathname.split('/');
    const fileId = pathParts[pathParts.length - 1]; // Get file ID from path
    const provider = url.searchParams.get('provider');
    
    if (!fileId) {
      return Response.json({ 
        success: false, 
        error: 'File ID is required' 
      }, { status: 400 });
    }
    
    if (!provider) {
      return Response.json({ 
        success: false, 
        error: 'Provider is required as a query parameter' 
      }, { status: 400 });
    }
    
    const aggregator = getAggregator();
    const providerInstance = aggregator['getProvider'](provider);
    
    if (!providerInstance) {
      return Response.json({ 
        success: false, 
        error: `Provider ${provider} not found` 
      }, { status: 404 });
    }
    
    // Get file metadata
    const metadata = await providerInstance['getFileMetadata'](fileId);
    
    if (!metadata) {
      return Response.json({ 
        success: false, 
        error: `File ${fileId} not found in ${provider}` 
      }, { status: 404 });
    }
    
    return Response.json({ 
      success: true, 
      file: metadata 
    });
  } catch (error) {
    console.error(`Error getting file ${request.url} data:`, error);
    return Response.json({ 
      success: false, 
      error: (error as Error).message 
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    if (!isValidRequest(request)) {
      return Response.json({ 
        success: false, 
        error: 'Invalid request' 
      }, { status: 400 });
    }

    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    const fileId = pathParts[pathParts.length - 1]; // Get file ID from path
    const provider = url.searchParams.get('provider');
    
    if (!fileId) {
      return Response.json({ 
        success: false, 
        error: 'File ID is required' 
      }, { status: 400 });
    }
    
    if (!provider) {
      return Response.json({ 
        success: false, 
        error: 'Provider is required as a query parameter' 
      }, { status: 400 });
    }
    
    const aggregator = getAggregator();
    const providerInstance = aggregator['getProvider'](provider);
    
    if (!providerInstance) {
      return Response.json({ 
        success: false, 
        error: `Provider ${provider} not found` 
      }, { status: 404 });
    }
    
    // Delete the file
    const result = await providerInstance['deleteFile'](fileId);
    
    if (!result) {
      return Response.json({ 
        success: false, 
        error: `Failed to delete file ${fileId} from ${provider}` 
      }, { status: 500 });
    }
    
    return Response.json({ 
      success: true, 
      message: `File ${fileId} deleted successfully from ${provider}` 
    });
  } catch (error) {
    console.error(`Error deleting file ${fileId}:`, error);
    return Response.json({ 
      success: false, 
      error: (error as Error).message 
    }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    if (!isValidRequest(request)) {
      return Response.json({ 
        success: false, 
        error: 'Invalid request' 
      }, { status: 400 });
    }

    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    const fileId = pathParts[pathParts.length - 1]; // Get file ID from path
    const provider = url.searchParams.get('provider');
    
    if (!fileId) {
      return Response.json({ 
        success: false, 
        error: 'File ID is required' 
      }, { status: 400 });
    }
    
    if (!provider) {
      return Response.json({ 
        success: false, 
        error: 'Provider is required as a query parameter' 
      }, { status: 400 });
    }
    
    const aggregator = getAggregator();
    const providerInstance = aggregator['getProvider'](provider);
    
    if (!providerInstance) {
      return Response.json({ 
        success: false, 
        error: `Provider ${provider} not found` 
      }, { status: 404 });
    }
    
    const { action, ...params } = await request.json();
    
    switch (action) {
      case 'move': {
        const { newParentId } = params;
        if (!newParentId) {
          return Response.json({ 
            success: false, 
            error: 'newParentId is required for move action' 
          }, { status: 400 });
        }
        
        const result = await providerInstance['moveFile'](fileId, newParentId);
        return Response.json({ 
          success: result, 
          message: result ? 'File moved successfully' : 'Failed to move file' 
        });
      }
      
      case 'rename': {
        const { newName } = params;
        if (!newName) {
          return Response.json({ 
            success: false, 
            error: 'newName is required for rename action' 
          }, { status: 400 });
        }
        
        // Note: Our providers don't have a direct rename method, so we'd need to implement this
        // by downloading, re-uploading, and deleting the old file
        // For now, return an error as it's not implemented in our providers
        return Response.json({ 
          success: false, 
          error: 'Rename operation not supported by this provider' 
        }, { status: 400 });
      }
      
      default:
        return Response.json({ 
          success: false, 
          error: 'Invalid action. Use action=move or action=rename' 
        }, { status: 400 });
    }
  } catch (error) {
    console.error(`Error updating file ${fileId}:`, error);
    return Response.json({ 
      success: false, 
      error: (error as Error).message 
    }, { status: 500 });
  }
}