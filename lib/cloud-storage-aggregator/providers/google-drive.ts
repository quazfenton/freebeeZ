import { StorageProvider, FileMetadata, StorageQuota, UploadResult, SearchOptions } from '../types';
import axios from 'axios';

interface GoogleDriveToken {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
}

interface GoogleDriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  createdTime: string;
  modifiedTime: string;
  parents?: string[];
  webViewLink?: string;
  iconLink?: string;
  ownedByMe: boolean;
}

interface GoogleDriveAbout {
  storageQuota: {
    limit: string;
    usage: string;
    usageInDrive?: string;
    usageInDriveTrash?: string;
  };
}

export class GoogleDriveProvider extends StorageProvider {
  private token: GoogleDriveToken | null = null;
  private readonly apiBase = 'https://www.googleapis.com/drive/v3';
  private readonly uploadApiBase = 'https://www.googleapis.com/upload/drive/v3';

  constructor(token?: string) {
    super();
    if (token) {
      this.setToken(token);
    }
  }

  setToken(accessToken: string): void {
    this.token = {
      accessToken,
      expiresAt: new Date(Date.now() + 1 * 60 * 60 * 1000) // 1 hour from now
    };
  }

  private getAuthHeaders(): { Authorization: string } {
    if (!this.token || !this.token.accessToken) {
      throw new Error('Google Drive token not set');
    }
    return {
      Authorization: `Bearer ${this.token.accessToken}`
    };
  }

  async getQuota(): Promise<StorageQuota> {
    try {
      const response = await axios.get(
        `${this.apiBase}/about`,
        {
          params: {
            fields: 'storageQuota'
          },
          headers: this.getAuthHeaders()
        }
      );

      const about = response.data as GoogleDriveAbout;
      const limit = parseInt(about.storageQuota.limit, 10);
      const usage = parseInt(about.storageQuota.usage, 10);
      const available = limit - usage;

      return {
        used: usage,
        total: limit,
        available: Math.max(0, available) // Ensure non-negative
      };
    } catch (error) {
      console.error('Error getting Google Drive quota:', error);
      throw error;
    }
  }

  async uploadFile(file: Buffer | string, filename: string, mimeType?: string): Promise<UploadResult> {
    try {
      // Prepare file metadata
      const metadata = {
        name: filename
      };

      const boundary = '----formdataseparator';
      const delimiter = `\r\n--${boundary}\r\n`;
      const closeDelimiter = `\r\n--${boundary}--`;

      // Create multipart upload body
      const multipartBody = 
        delimiter +
        'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
        JSON.stringify(metadata) +
        delimiter +
        `Content-Type: ${mimeType || 'application/octet-stream'}\r\n\r\n` +
        (Buffer.isBuffer(file) ? file.toString('binary') : file) +
        closeDelimiter;

      const response = await axios.post(
        `${this.uploadApiBase}/files`,
        multipartBody,
        {
          headers: {
            ...this.getAuthHeaders(),
            'Content-Type': `multipart/related; boundary=${boundary}`
          },
          params: {
            uploadType: 'multipart'
          }
        }
      );

      const result = response.data as GoogleDriveFile;
      return {
        success: true,
        fileId: result.id,
        url: result.webViewLink || `https://drive.google.com/file/d/${result.id}/view`,
        size: result.size ? parseInt(result.size, 10) : undefined,
        mimeType: result.mimeType
      };
    } catch (error) {
      console.error('Error uploading to Google Drive:', error);
      throw error;
    }
  }

  async downloadFile(fileId: string): Promise<Buffer | null> {
    try {
      const response = await axios.get(
        `${this.apiBase}/files/${fileId}`,
        {
          headers: this.getAuthHeaders(),
          params: {
            alt: 'media'
          },
          responseType: 'arraybuffer'
        }
      );

      return Buffer.from(response.data);
    } catch (error) {
      console.error('Error downloading from Google Drive:', error);
      throw error;
    }
  }

  async deleteFile(fileId: string): Promise<boolean> {
    try {
      await axios.delete(
        `${this.apiBase}/files/${fileId}`,
        { headers: this.getAuthHeaders() }
      );

      return true;
    } catch (error) {
      console.error('Error deleting from Google Drive:', error);
      return false;
    }
  }

  async listFiles(parentId?: string): Promise<FileMetadata[]> {
    try {
      const params: any = {
        fields: 'files(id,name,mimeType,size,modifiedTime,createdTime,webViewLink)',
        q: parentId ? `'${parentId}' in parents and trashed = false` : "trashed = false and 'root' in parents"
      };

      const response = await axios.get(
        `${this.apiBase}/files`,
        {
          headers: this.getAuthHeaders(),
          params
        }
      );

      const files: GoogleDriveFile[] = response.data.files;
      return files.map(this.mapGoogleDriveMetadata);
    } catch (error) {
      console.error('Error listing Google Drive files:', error);
      return [];
    }
  }

  async searchFiles(query: string, options?: SearchOptions): Promise<FileMetadata[]> {
    try {
      // Build query string for Google Drive
      let q = `name contains '${query}' and trashed = false`;
      if (options?.mimeType) {
        q += ` and mimeType = '${options.mimeType}'`;
      }
      if (options?.sizeMin !== undefined) {
        q += ` and size > ${options.sizeMin}`;
      }
      if (options?.sizeMax !== undefined) {
        q += ` and size < ${options.sizeMax}`;
      }
      if (options?.parentId) {
        q += ` and '${options.parentId}' in parents`;
      }

      const params = {
        fields: 'files(id,name,mimeType,size,modifiedTime,createdTime,webViewLink)',
        q
      };

      const response = await axios.get(
        `${this.apiBase}/files`,
        {
          headers: this.getAuthHeaders(),
          params
        }
      );

      const files: GoogleDriveFile[] = response.data.files;
      return files.map(this.mapGoogleDriveMetadata);
    } catch (error) {
      console.error('Error searching Google Drive files:', error);
      return [];
    }
  }

  async getFileMetadata(fileId: string): Promise<FileMetadata | null> {
    try {
      const response = await axios.get(
        `${this.apiBase}/files/${fileId}`,
        {
          headers: this.getAuthHeaders(),
          params: {
            fields: 'id,name,mimeType,size,modifiedTime,createdTime,webViewLink,iconLink,parents'
          }
        }
      );

      return this.mapGoogleDriveMetadata(response.data);
    } catch (error) {
      console.error('Error getting Google Drive file metadata:', error);
      return null;
    }
  }

  async createFolder(name: string, parentId?: string): Promise<{ success: boolean; folderId?: string }> {
    try {
      const response = await axios.post(
        `${this.apiBase}/files`,
        {
          name,
          mimeType: 'application/vnd.google-apps.folder',
          parents: parentId ? [parentId] : ['root']
        },
        { headers: this.getAuthHeaders() }
      );

      return {
        success: true,
        folderId: response.data.id
      };
    } catch (error) {
      console.error('Error creating Google Drive folder:', error);
      return { success: false };
    }
  }

  async moveFile(fileId: string, newParentId: string): Promise<boolean> {
    try {
      const file = await this.getFileMetadata(fileId);
      if (!file || !fileId) return false;

      // Get old parent to remove from
      const oldParents = file.parents || ['root'];

      await axios.patch(
        `${this.apiBase}/files/${fileId}`,
        {},
        {
          headers: this.getAuthHeaders(),
          params: {
            addParents: newParentId,
            removeParents: oldParents.join(',')
          }
        }
      );

      return true;
    } catch (error) {
      console.error('Error moving Google Drive file:', error);
      return false;
    }
  }

  private mapGoogleDriveMetadata(gdriveFile: GoogleDriveFile): FileMetadata {
    return {
      id: gdriveFile.id,
      name: gdriveFile.name,
      size: gdriveFile.size ? parseInt(gdriveFile.size, 10) : 0,
      mimeType: gdriveFile.mimeType,
      modified: new Date(gdriveFile.modifiedTime),
      created: new Date(gdriveFile.createdTime),
      url: gdriveFile.webViewLink || `https://drive.google.com/file/d/${gdriveFile.id}/view`,
      thumbnailUrl: gdriveFile.iconLink
    };
  }
}