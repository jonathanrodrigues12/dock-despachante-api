import { Injectable } from '@nestjs/common';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { IStorageService } from '../interfaces/storage.interface';
import { EnvService } from '../../env/env.service';

@Injectable()
export class S3StorageService implements IStorageService {
  private s3Client: S3Client;
  private bucketName: string;
  private region: string;

  constructor(private readonly envService: EnvService) {
    const accessKeyId = this.envService.get('AWS_ACCESS_KEY_ID');
    const secretAccessKey = this.envService.get('AWS_SECRET_ACCESS_KEY');
    const region = this.envService.get('AWS_REGION');
    const bucketName = this.envService.get('AWS_S3_BUCKET_NAME');

    if (!bucketName) {
      throw new Error('AWS_S3_BUCKET_NAME is required');
    }

    this.bucketName = bucketName;
    this.region = region;

    this.s3Client = new S3Client({
      region,
      credentials:
        accessKeyId && secretAccessKey
          ? {
              accessKeyId,
              secretAccessKey,
            }
          : undefined,
    });
  }

  async uploadFile(
    file: Buffer,
    fileName: string,
    folder = '',
    contentType = 'image/jpeg',
  ): Promise<string> {
    const key = folder ? `${folder}/${fileName}` : fileName;

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      Body: file,
      ContentType: contentType,
      CacheControl: 'public, max-age=31536000',
      // ACL removido - buckets modernos do S3 usam políticas de bucket para acesso público
      // Certifique-se de que o bucket tenha uma política que permita leitura pública
    });

    await this.s3Client.send(command);

    return this.getFileUrl(fileName, folder);
  }

  async deleteFile(fileUrl: string): Promise<void> {
    try {
      const key = this.extractKeyFromUrl(fileUrl);
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      await this.s3Client.send(command);
    } catch (error) {
      console.error('Error deleting file from S3:', error);
    }
  }

  getFileUrl(fileName: string, folder = ''): string {
    const key = folder ? `${folder}/${fileName}` : fileName;
    const baseUrl = this.envService.get('AWS_S3_BASE_URL');

    if (baseUrl) {
      return `${baseUrl}/${key}`;
    }

    return `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${key}`;
  }

  private extractKeyFromUrl(url: string): string {
    const urlObj = new URL(url);
    return urlObj.pathname.startsWith('/') ? urlObj.pathname.slice(1) : urlObj.pathname;
  }
}
