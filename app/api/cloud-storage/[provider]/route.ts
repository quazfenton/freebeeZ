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
    const provider = url.pathname.split('/').slice(-1)[0]; // Get provider from path
    
    if (!provider) {
      return Response.json({ 
        success: false, 
        error: 'Provider name is required' 
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
    
    const quota = await providerInstance['getQuota']();
    const files = await providerInstance['listFiles']();
    
    return Response.json({ 
      success: true, 
      provider,
      quota,
      files
    });
  } catch (error) {
    console.error(`Error getting ${request.url} data:`, error);
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
    const provider = url.pathname.split('/').slice(-1)[0]; // Get provider from path
    
    if (!provider) {
      return Response.json({ 
        success: false, 
        error: 'Provider name is required' 
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
      case 'createFolder': {
        const { name, parentId } = params;
        if (!name) {
          return Response.json({ 
            success: false, 
            error: 'Folder name is required' 
          }, { status: 400 });
        }
        
        const result = await providerInstance['createFolder'](name, parentId);
        return Response.json({ success: true, ...result });
      }
      
      case 'search': {
        const { query } = params;
        if (!query) {
          return Response.json({ 
            success: false, 
            error: 'Search query is required' 
          }, { status: 400 });
        }
        
        const files = await providerInstance['searchFiles'](query);
        return Response.json({ success: true, files });
      }
      
      case 'uploadTest': {
        // For testing purposes, upload a small test file
        const { filename, content = 'Test content' } = params;
        if (!filename) {
          return Response.json({ 
            success: false, 
            error: 'Filename is required for upload test' 
          }, { status: 400 });
        }
        
        const result = await providerInstance['uploadFile'](content, filename, 'text/plain');
        return Response.json({ success: true, result });
      }
      
      default:
        return Response.json({ 
          success: false, 
          error: 'Invalid action. Use action=createFolder, action=search, or action=uploadTest' 
        }, { status: 400 });
    }
  } catch (error) {
    console.error(`Error posting to ${provider} provider:`, error);
    return Response.json({ 
      success: false, 
      error: (error as Error).message 
    }, { status: 500 });
  }
}