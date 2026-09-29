import {
  Controller,
  Post,
  Put,
  Get,
  All,
  Query,
  Req,
  Res,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Request, Response } from 'express';
import { ApiTags, ApiOperation, ApiConsumes } from '@nestjs/swagger';
import { StorageService } from './storage.service';
import { Public } from '../common/decorators/public.decorator';
import * as fs from 'fs';
import * as path from 'path';

@ApiTags('storage')
@Controller('storage')
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  @Public()
  @All('upload')
  @ApiOperation({ summary: 'Local storage file upload endpoint (used in dev mode)' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @Query('key') key: string,
    @Req() req: Request,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    let buffer: Buffer | null = null;
    let mimeType: string = (req.headers['content-type'] as string) || 'image/jpeg';

    if (file && file.buffer) {
      buffer = file.buffer;
      mimeType = file.mimetype || mimeType;
    } else if (req.body && Buffer.isBuffer(req.body)) {
      buffer = req.body;
    } else {
      buffer = await new Promise<Buffer>((resolve, reject) => {
        const chunks: Buffer[] = [];
        req.on('data', (chunk) => {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        });
        req.on('end', () => resolve(Buffer.concat(chunks)));
        req.on('error', (err) => reject(err));
      });
    }

    if (!buffer || buffer.length === 0) {
      throw new BadRequestException('File or binary payload is required');
    }

    const finalKey = key || `uploads/${Date.now()}_upload.jpg`;
    await this.storageService.saveFile(finalKey, buffer, mimeType);
    console.log(`📸 [StorageController] Successfully saved screenshot: ${finalKey} (${buffer.length} bytes)`);

    return {
      storageKey: finalKey,
      fileSize: buffer.length,
      mimeType,
      status: 'uploaded',
    };
  }

  @Public()
  @Post('upload-binary')
  async uploadBinary(
    @Query('key') key: string,
    @Req() req: Request,
  ) {
    const buffer = await new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = [];
      req.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
      req.on('end', () => resolve(Buffer.concat(chunks)));
      req.on('error', (err) => reject(err));
    });
    const mimeType = (req.headers['content-type'] as string) || 'image/jpeg';
    const finalKey = key || `uploads/${Date.now()}_upload.jpg`;
    await this.storageService.saveFile(finalKey, buffer, mimeType);
    return { storageKey: finalKey, fileSize: buffer.length, mimeType };
  }

  @Public()
  @Get('files')
  @ApiOperation({ summary: 'Retrieve file from local storage' })
  async getFile(@Query('key') key: string, @Res() res: Response) {
    if (!key) {
      throw new BadRequestException('Storage key is required');
    }

    const filePath = this.storageService.getLocalFilePath(key);
    if (!fs.existsSync(filePath)) {
      // If file doesn't exist locally (e.g. seeded demo screenshot), send a neat SVG placeholder
      res.setHeader('Content-Type', 'image/svg+xml');
      const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="800" height="450" viewBox="0 0 800 450">
          <rect width="100%" height="100%" fill="#1e293b"/>
          <rect x="20" y="20" width="760" height="410" rx="8" fill="#0f172a" stroke="#334155" stroke-width="2"/>
          <circle cx="45" cy="45" r="6" fill="#ef4444"/>
          <circle cx="65" cy="45" r="6" fill="#f59e0b"/>
          <circle cx="85" cy="45" r="6" fill="#10b981"/>
          <text x="400" y="200" fill="#94a3b8" font-family="monospace" font-size="20" text-anchor="middle" font-weight="bold">PulseTime Desktop Screen Capture</text>
          <text x="400" y="235" fill="#64748b" font-family="monospace" font-size="14" text-anchor="middle">Timestamp: ${new Date().toISOString()}</text>
          <text x="400" y="265" fill="#3b82f6" font-family="monospace" font-size="13" text-anchor="middle">Activity: Active Work Session</text>
        </svg>
      `;
      return res.send(svg);
    }

    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.webp': 'image/webp',
      '.svg': 'image/svg+xml',
    };
    res.setHeader('Content-Type', mimeTypes[ext] || 'application/octet-stream');
    const stream = fs.createReadStream(filePath);
    return stream.pipe(res);
  }
}
