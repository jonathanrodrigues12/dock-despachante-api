import { Injectable } from '@nestjs/common';
import { Storage } from '@google-cloud/storage';
import { IStorageService } from '../interfaces/storage.interface';
import { EnvService } from '../../env/env.service';

@Injectable()
export class GcpStorageService implements IStorageService {
  private storage: Storage;
  private bucketName: string;

  constructor(private readonly envService: EnvService) {
    const projectId = this.envService.get('GCP_PROJECT_ID');
    const keyFilename = this.envService.get('GCP_KEY_FILENAME');
    const bucketName = this.envService.get('GCP_BUCKET_NAME');

    if (!bucketName) {
      throw new Error('GCP_BUCKET_NAME is required');
    }

    this.bucketName = bucketName;

    if (keyFilename) {
      this.storage = new Storage({
        projectId,
        keyFilename,
      });
    } else {
      const credentialsString = this.envService.get('GCP_CREDENTIALS');
      if (credentialsString) {
        const credentials = JSON.parse(credentialsString);
        this.storage = new Storage({
          projectId,
          credentials,
        });
      } else {
        this.storage = new Storage({
          projectId,
        });
      }
    }
  }

  async uploadFile(
    file: Buffer,
    fileName: string,
    folder = '',
    contentType = 'image/jpeg',
  ): Promise<string> {
    const bucket = this.storage.bucket(this.bucketName);
    const filePath = folder ? `${folder}/${fileName}` : fileName;
    const bucketFile = bucket.file(filePath);

    await bucketFile.save(file, {
      contentType,
      metadata: {
        cacheControl: 'public, max-age=31536000',
      },
    });

    await bucketFile.makePublic();

    const url = this.getFileUrl(fileName, folder);

    return url;
  }

  async deleteFile(fileUrl: string): Promise<void> {
    try {
      const fileName = this.extractFileNameFromUrl(fileUrl);
      const bucket = this.storage.bucket(this.bucketName);
      const file = bucket.file(fileName);
      await file.delete();
    } catch (error) {
      console.error('Error deleting file from GCP:', error);
    }
  }

  getFileUrl(fileName: string, folder = ''): string {
    const filePath = folder ? `${folder}/${fileName}` : fileName;
    return `https://storage.googleapis.com/${this.bucketName}/${filePath}`;
  }

  private extractFileNameFromUrl(url: string): string {
    const match = url.match(/storage\.googleapis\.com\/[^/]+\/(.+)$/);
    return match ? match[1] : url;
  }
}
