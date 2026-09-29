import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StorageProvider, UploadUrlResult } from './storage.interface';
import * as fs from 'fs';
import * as path from 'path';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class StorageService implements StorageProvider {
  private readonly logger = new Logger(StorageService.name);
  private readonly provider: 'local' | 's3';
  private readonly localDir: string;
  private s3Client: S3Client | null = null;
  private readonly s3Bucket: string;

  constructor(private readonly configService: ConfigService) {
    this.provider = (this.configService.get<string>('STORAGE_PROVIDER', 'local') as 'local' | 's3');
    this.localDir = path.resolve(this.configService.get<string>('STORAGE_LOCAL_DIR', './uploads'));
    this.s3Bucket = this.configService.get<string>('S3_BUCKET', 'pulsetime-screenshots');

    if (this.provider === 'local') {
      if (!fs.existsSync(this.localDir)) {
        fs.mkdirSync(this.localDir, { recursive: true });
      }
      this.logger.log(`Initialized Local Storage Provider at ${this.localDir}`);
    } else {
      const endpoint = this.configService.get<string>('S3_ENDPOINT');
      const region = this.configService.get<string>('S3_REGION', 'us-east-1');
      const accessKeyId = this.configService.get<string>('S3_ACCESS_KEY', '');
      const secretAccessKey = this.configService.get<string>('S3_SECRET_KEY', '');
      const forcePathStyle = this.configService.get<boolean>('S3_FORCE_PATH_STYLE', true);

      this.s3Client = new S3Client({
        region,
        endpoint: endpoint || undefined,
        forcePathStyle,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
      });
      this.logger.log(`Initialized S3 Storage Provider for bucket: ${this.s3Bucket}`);
    }
  }

  async getUploadUrl(key: string, mimeType: string): Promise<UploadUrlResult> {
    if (this.provider === 's3' && this.s3Client) {
      const command = new PutObjectCommand({
        Bucket: this.s3Bucket,
        Key: key,
        ContentType: mimeType,
      });
      const uploadUrl = await getSignedUrl(this.s3Client, command, { expiresIn: 900 });
      return {
        uploadUrl,
        storageKey: key,
        method: 'PUT',
        expiresInSeconds: 900,
        headers: { 'Content-Type': mimeType },
      };
    }

    // Local storage upload URL handled by StorageController
    const baseUrl = this.configService.get<string>('API_BASE_URL', `http://localhost:${this.configService.get('PORT', 4000)}`);
    return {
      uploadUrl: `${baseUrl}/api/v1/storage/upload?key=${encodeURIComponent(key)}`,
      storageKey: key,
      method: 'POST',
      expiresInSeconds: 900,
    };
  }

  async getFileUrl(key: string): Promise<string> {
    if (this.provider === 's3' && this.s3Client) {
      const command = new GetObjectCommand({
        Bucket: this.s3Bucket,
        Key: key,
      });
      return await getSignedUrl(this.s3Client, command, { expiresIn: 3600 });
    }

    const baseUrl = this.configService.get<string>('API_BASE_URL', `http://localhost:${this.configService.get('PORT', 4000)}`);
    return `${baseUrl}/api/v1/storage/files?key=${encodeURIComponent(key)}`;
  }

  async saveFile(key: string, buffer: Buffer, mimeType: string): Promise<string> {
    if (this.provider === 's3' && this.s3Client) {
      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: this.s3Bucket,
          Key: key,
          Body: buffer,
          ContentType: mimeType,
        }),
      );
      return key;
    }

    const filePath = path.join(this.localDir, key);
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, buffer);
    return key;
  }

  async deleteFile(key: string): Promise<boolean> {
    if (this.provider === 's3' && this.s3Client) {
      await this.s3Client.send(
        new DeleteObjectCommand({
          Bucket: this.s3Bucket,
          Key: key,
        }),
      );
      return true;
    }

    const filePath = path.join(this.localDir, key);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
    return false;
  }

  getLocalFilePath(key: string): string {
    return path.join(this.localDir, key);
  }
}
