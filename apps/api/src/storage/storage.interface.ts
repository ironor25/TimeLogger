export interface UploadUrlResult {
  uploadUrl: string;
  storageKey: string;
  method: 'PUT' | 'POST';
  expiresInSeconds: number;
  headers?: Record<string, string>;
}

export interface StorageProvider {
  getUploadUrl(key: string, mimeType: string): Promise<UploadUrlResult>;
  getFileUrl(key: string): Promise<string>;
  saveFile(key: string, buffer: Buffer, mimeType: string): Promise<string>;
  deleteFile(key: string): Promise<boolean>;
}
