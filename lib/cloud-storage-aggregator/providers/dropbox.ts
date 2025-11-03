import { StorageProvider, FileMetadata, StorageQuota, UploadResult, SearchOptions } from '../types';
import axios from 'axios';

interface DropboxToken {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
}

interface DropboxFileMetadata {
  id: string;
  name: string;
  size: number;
  client_modified: string;
  server_modified: string;
  path_lower: string;
  path_display: string;
  content_hash?: string;
  mime_type: string;
}

export class DropboxProvider extends StorageProvider {
  private token: DropboxToken | null = null;
  private readonly apiBase = 'https://api.dropboxapi.com/2';
  private readonly contentApiBase = 'https://content.dropboxapi.com/2';

  constructor(token?: string) {
    super();
    if (token) {
      this.setToken(token);
    }
  }

  setToken(accessToken: string): void {
    this.token = {
      accessToken,
      expiresAt: new Date(Date.now() + 4 * 60 * 60 * 1000) // 4 hours from now
    };
  }

  private getAuthHeaders(): { Authorization: string } {
    if (!this.token || !this.token.accessToken) {
      throw new Error('Dropbox token not set');
    }
    return {
      Authorization: `Bearer ${this.token.accessToken}`
    };
  }

  async getQuota(): Promise<StorageQuota> {
    try {
      const response = await axios.post(
        `${this.apiBase}/users/get_space_usage`,
        {},
        { headers: this.getAuthHeaders() }
      );

      const { used, allocation } = response.data;
      const total = allocation.allocated;
      const available = total - used;

      return {
        used,
        total,
        available: Math.max(0, available) // Ensure non-negative
      };
    } catch (error) {
      console.error('Error getting Dropbox quota:', error);
      throw error;
    }
  }

  async uploadFile(file: Buffer | string, filename: string, mimeType?: string): Promise<UploadResult> {
    try {
      // For large files, we'd need to use chunked upload, but for simplicity we use simple upload
      const path = `/${filename}`;
      
      const response = await axios.post(
        `${this.contentApiBase}/files/upload`,
        file,
        {
          headers: {
            ...this.getAuthHeaders(),
            'Content-Type': 'application/octet-stream',
            'Dropbox-API-Arg': JSON.stringify({
              path,
              mode: 'add',
              autorename: true,
              mute: true
            })
          }
        }
      );

      const result = response.data as DropboxFileMetadata;
      return {
        success: true,
        fileId: result.id,
        url: `https://www.dropbox.com/home${result.path_display}`,
        size: result.size,
        mimeType: result.mime_type
      };
    } catch (error) {
      console.error('Error uploading to Dropbox:', error);
      throw error;
    }
  }

  async downloadFile(fileId: string): Promise<Buffer | null> {
    try {
      // First get file metadata to know the path
      const metadata = await this.getFileMetadata(fileId);
      if (!metadata) {
        return null;
      }

      const response = await axios.post(
        `${this.contentApiBase}/files/download`,
        {},
        {
          headers: {
            ...this.getAuthHeaders(),
            'Dropbox-API-Arg': JSON.stringify({
              path: metadata.id // Actually need the path, not the ID
            })
          },
          responseType: 'arraybuffer'
        }
      );

      return Buffer.from(response.data);
    } catch (error) {
      console.error('Error downloading from Dropbox:', error);
      throw error;
    }
  }

  async deleteFile(fileId: string): Promise<boolean> {
    try {
      const response = await axios.post(
        `${this.apiBase}/files/delete_v2`,
        {
          path: fileId // Assuming fileId is the path
        },
        { headers: this.getAuthHeaders() }
      );

      return !!response.data;
    } catch (error) {
      console.error('Error deleting from Dropbox:', error);
      return false;
    }
  }

  async listFiles(parentId?: string): Promise<FileMetadata[]> {
    try {
      const response = await axios.post(
        `${this.apiBase}/files/list_folder`,
        {
          path: parentId || '',
          recursive: false
        },
        { headers: this.getAuthHeaders() }
      );

      const entries: DropboxFileMetadata[] = response.data.entries;
      return entries.map(this.mapDropboxMetadata);
    } catch (error) {
      console.error('Error listing Dropbox files:', error);
      return [];
    }
  }

  async searchFiles(query: string, options?: SearchOptions): Promise<FileMetadata[]> {
    try {
      const response = await axios.post(
        `${this.apiBase}/files/search_v2`,
        {
          query,
          options: {
            path: options?.parentId || '',
            file_status: 'active'
          }
        },
        { headers: this.getAuthHeaders() }
      );

      const matches = response.data.matches;
      return matches.map((match: any) => this.mapDropboxMetadata(match.metadata.value));
    } catch (error) {
      console.error('Error searching Dropbox files:', error);
      return [];
    }
  }

  async getFileMetadata(fileId: string): Promise<FileMetadata | null> {
    try {
      // Dropbox API requires path, not just file ID
      // This is a simplified approach - in practice, you'd need to maintain
      // a mapping of file IDs to paths or use file properties
      const response = await axios.post(
        `${this.apiBase}/files/get_metadata`,
        {
          path: fileId // This assumes fileId is actually a path
        },
        { headers: this.getAuthHeaders() }
      );

      return this.mapDropboxMetadata(response.data);
    } catch (error) {
      console.error('Error getting Dropbox file metadata:', error);
      return null;
    }
  }

  async createFolder(name: string, parentId?: string): Promise<{ success: boolean; folderId?: string }> {
    try {
      const path = parentId ? `${parentId}/${name}` : `/${name}`;
      const response = await axios.post(
        `${this.apiBase}/files/create_folder_v2`,
        { path },
        { headers: this.getAuthHeaders() }
      );

      return {
        success: true,
        folderId: response.data.metadata.id
      };
    } catch (error) {
      console.error('Error creating Dropbox folder:', error);
      return { success: false };
    }
  }

  async moveFile(fileId: string, newParentId: string): Promise<boolean> {
    try {
      const newFilePath = `${newParentId}/${fileId.split('/').pop()}`;
      const response = await axios.post(
        `${this.apiBase}/files/move_v2`,
        {
          from_path: fileId,
          to_path: newFilePath
        },
        { headers: this.getAuthHeaders() }
      );

      return !!response.data;
    } catch (error) {
      console.error('Error moving Dropbox file:', error);
      return false;
    }
  }

  private mapDropboxMetadata(dropboxMeta: DropboxFileMetadata): FileMetadata {
    return {
      id: dropboxMeta.path_lower,
      name: dropboxMeta.name,
      size: dropboxMeta.size,
      mimeType: dropboxMeta.mime_type || 'application/octet-stream',
      modified: new Date(dropboxMeta.server_modified),
      created: new Date(dropboxMeta.client_modified),
      url: `https://www.dropbox.com/home${dropboxMeta.path_display}`
    };
  }
}