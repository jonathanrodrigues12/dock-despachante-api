import { Injectable } from '@nestjs/common';
import { IStorageService } from '../interfaces/storage.interface';
import { EnvService } from '../../env/env.service';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class LocalStorageService implements IStorageService {
  private uploadDir: string;
  private baseUrl: string;

  constructor(private readonly envService: EnvService) {
    this.uploadDir = this.envService.get('LOCAL_STORAGE_PATH') || './uploads';
    this.baseUrl = this.envService.get('LOCAL_STORAGE_BASE_URL') || '/uploads';

    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async uploadFile(
    file: Buffer,
    fileName: string,
    folder = '',
    contentType = 'image/jpeg',
  ): Promise<string> {
    const targetDir = folder ? path.join(this.uploadDir, folder) : this.uploadDir;

    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const filePath = path.join(targetDir, fileName);
    await fs.promises.writeFile(filePath, file);

    return this.getFileUrl(fileName, folder);
  }

  async deleteFile(fileUrl: string): Promise<void> {
    try {
      const relativePath = this.extractPathFromUrl(fileUrl);
      const filePath = path.join(this.uploadDir, relativePath);

      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
      }
    } catch (error) {
      console.error('Error deleting local file:', error);
    }
  }

  getFileUrl(fileName: string, folder = ''): string {
    const filePath = folder ? `${folder}/${fileName}` : fileName;
    return `${this.baseUrl}/${filePath}`;
  }

  private extractPathFromUrl(url: string): string {
    const baseUrlPath = this.baseUrl.replace(/^\//, '');
    const regex = new RegExp(`${baseUrlPath}/(.+)$`);
    const match = url.match(regex);
    return match ? match[1] : url;
  }
}
