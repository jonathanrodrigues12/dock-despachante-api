import { Injectable } from '@nestjs/common';
import sharp from 'sharp';
import { IStorageService, UploadResult } from '../interfaces/storage.interface';
import { EnvService } from '../../env/env.service';

export interface ImageProcessingOptions {
  quality?: number;
  generateThumbnail?: boolean;
  thumbnailWidth?: number;
  thumbnailHeight?: number;
  enableCompression?: boolean;
}

@Injectable()
export class ImageProcessingService {
  private readonly defaultQuality: number;
  private readonly defaultThumbnailWidth: number = 300;
  private readonly defaultThumbnailHeight: number = 300;
  private readonly enableCompression: boolean;

  constructor(private readonly envService: EnvService) {
    const qualityFromEnv = this.envService.get('IMAGE_QUALITY');
    this.defaultQuality = Number(qualityFromEnv);

    const compressionEnabled = this.envService.get('IMAGE_COMPRESSION_ENABLED');
    this.enableCompression =
      compressionEnabled === undefined || compressionEnabled === null
        ? true
        : String(compressionEnabled).toLowerCase() !== 'false';
  }

  private isImageFile(mimetype: string): boolean {
    return mimetype.startsWith('image/');
  }

  private async compressImage(buffer: Buffer, mimetype: string, quality: number): Promise<Buffer> {
    try {
      const sharpInstance = sharp(buffer);

      let compressedBuffer: Buffer;

      switch (mimetype.toLowerCase()) {
        case 'image/jpeg':
        case 'image/jpg':
          compressedBuffer = await sharpInstance
            .resize(1920, 1920, {
              fit: 'inside',
              withoutEnlargement: true,
            })
            .jpeg({ quality })
            .toBuffer();
          break;

        case 'image/png': {
          const compressionLevel = Math.round((100 - quality) / 11.11);
          compressedBuffer = await sharpInstance
            .resize(1920, 1920, {
              fit: 'inside',
              withoutEnlargement: true,
            })
            .png({ compressionLevel: Math.min(9, Math.max(0, compressionLevel)) })
            .toBuffer();
          break;
        }

        case 'image/webp':
          compressedBuffer = await sharpInstance
            .resize(1920, 1920, {
              fit: 'inside',
              withoutEnlargement: true,
            })
            .webp({ quality })
            .toBuffer();
          break;

        case 'image/gif':
          return buffer;

        default:
          compressedBuffer = await sharpInstance
            .resize(1920, 1920, {
              fit: 'inside',
              withoutEnlargement: true,
            })
            .jpeg({ quality })
            .toBuffer();
          break;
      }

      return compressedBuffer;
    } catch (error) {
      return buffer;
    }
  }

  async processAndUpload(
    file: Express.Multer.File,
    storageService: IStorageService,
    folder = 'images',
    options: ImageProcessingOptions = {},
  ): Promise<UploadResult> {
    const {
      quality = this.defaultQuality,
      generateThumbnail = true,
      thumbnailWidth = this.defaultThumbnailWidth,
      thumbnailHeight = this.defaultThumbnailHeight,
      enableCompression = this.enableCompression,
    } = options;

    const finalQuality = Number(quality) || this.defaultQuality;
    const finalThumbnailWidth = Number(thumbnailWidth) || this.defaultThumbnailWidth;
    const finalThumbnailHeight = Number(thumbnailHeight) || this.defaultThumbnailHeight;

    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const originalExtension = file.originalname.split('.').pop();
    const baseFileName = `${timestamp}-${randomString}`;
    const fileName = `${baseFileName}.${originalExtension}`;
    const thumbnailFileName = `${baseFileName}-thumb.${originalExtension}`;

    let processedImage: Buffer;
    let contentType = file.mimetype;

    if (enableCompression && this.isImageFile(file.mimetype) && file.buffer) {
      processedImage = await this.compressImage(file.buffer, file.mimetype, finalQuality);

      if (file.mimetype !== 'image/png' && file.mimetype !== 'image/webp') {
        contentType = 'image/jpeg';
      }
    } else {
      processedImage = file.buffer || Buffer.from([]);
    }

    const imageUrl = await storageService.uploadFile(processedImage, fileName, folder, contentType);

    let thumbnailUrl: string | undefined;
    if (generateThumbnail && this.isImageFile(file.mimetype) && file.buffer) {
      const thumbnailQuality = Math.max(finalQuality - 10, 50);

      const thumbnailImage = await sharp(file.buffer)
        .resize(finalThumbnailWidth, finalThumbnailHeight, {
          fit: 'cover',
          position: 'center',
        })
        .jpeg({ quality: thumbnailQuality })
        .toBuffer();

      thumbnailUrl = await storageService.uploadFile(
        thumbnailImage,
        thumbnailFileName,
        folder,
        'image/jpeg',
      );
    }

    const result = {
      url: imageUrl,
      fileName,
      thumbnailUrl,
    };

    return result;
  }

  async processAndUploadFromBuffer(
    buffer: Buffer,
    originalName: string,
    storageService: IStorageService,
    folder = 'images',
    options: ImageProcessingOptions = {},
  ): Promise<UploadResult> {
    const {
      quality = this.defaultQuality,
      generateThumbnail = true,
      thumbnailWidth = this.defaultThumbnailWidth,
      thumbnailHeight = this.defaultThumbnailHeight,
      enableCompression = this.enableCompression,
    } = options;

    const finalQuality = Number(quality) || this.defaultQuality;
    const finalThumbnailWidth = Number(thumbnailWidth) || this.defaultThumbnailWidth;
    const finalThumbnailHeight = Number(thumbnailHeight) || this.defaultThumbnailHeight;

    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const originalExtension = originalName.split('.').pop();
    const baseFileName = `${timestamp}-${randomString}`;
    const fileName = `${baseFileName}.${originalExtension}`;
    const thumbnailFileName = `${baseFileName}-thumb.${originalExtension}`;

    let processedImage: Buffer;
    let contentType = 'image/jpeg';

    if (enableCompression) {
      processedImage = await this.compressImage(buffer, 'image/jpeg', finalQuality);
    } else {
      processedImage = buffer;
    }

    const imageUrl = await storageService.uploadFile(processedImage, fileName, folder, contentType);

    let thumbnailUrl: string | undefined;
    if (generateThumbnail) {
      const thumbnailQuality = Math.max(finalQuality - 10, 50);
      const thumbBuffer = await sharp(buffer)
        .resize(finalThumbnailWidth, finalThumbnailHeight, {
          fit: 'cover',
          position: 'center',
        })
        .jpeg({ quality: thumbnailQuality })
        .toBuffer();

      thumbnailUrl = await storageService.uploadFile(
        thumbBuffer,
        thumbnailFileName,
        folder,
        'image/jpeg',
      );
    }

    return {
      url: imageUrl,
      fileName,
      thumbnailUrl,
    };
  }
}
