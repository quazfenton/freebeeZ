export interface FileMetadata {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  modified: Date;
  created?: Date;
  url?: string;
  thumbnailUrl?: string;
  parentId?: string;
  version?: string;
}

export interface StorageQuota {
  used: number;
  total: number;
  available: number;
}

export interface UploadResult {
  success: boolean;
  fileId: string;
  url?: string;
  size?: number;
  mimeType?: string;
}

export interface SearchOptions {
  query?: string;
  mimeType?: string;
  sizeMin?: number;
  sizeMax?: number;
  dateFrom?: Date;
  dateTo?: Date;
  parentId?: string;
  maxResults?: number;
}

export abstract class StorageProvider {
  abstract getQuota(): Promise<StorageQuota>;
  abstract uploadFile(file: Buffer | string, filename: string, mimeType?: string): Promise<UploadResult>;
  abstract downloadFile(fileId: string): Promise<Buffer | null>;
  abstract deleteFile(fileId: string): Promise<boolean>;
  abstract listFiles(parentId?: string): Promise<FileMetadata[]>;
  abstract searchFiles(query: string, options?: SearchOptions): Promise<FileMetadata[]>;
  abstract getFileMetadata(fileId: string): Promise<FileMetadata | null>;
  abstract createFolder(name: string, parentId?: string): Promise<{ success: boolean; folderId?: string }>;
  abstract moveFile(fileId: string, newParentId: string): Promise<boolean>;
}