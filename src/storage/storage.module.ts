import { Module } from '@nestjs/common';
import { GcpStorageService } from './services/gcp-storage.service';
import { S3StorageService } from './services/s3-storage.service';
import { LocalStorageService } from './services/local-storage.service';
import { ImageProcessingService } from './services/image-processing.service';
import { IStorageService } from './interfaces/storage.interface';
import { EnvModule } from '../env/env.module';
import { EnvService } from '../env/env.service';
import { StorageController } from './storage.controller';

const storageProvider = {
  provide: 'STORAGE_SERVICE',
  useFactory: (envService: EnvService): IStorageService => {
    const storageType = envService.get('STORAGE_TYPE') || 'local';

    if (storageType === 'gcp') {
      return new GcpStorageService(envService);
    }

    if (storageType === 's3') {
      return new S3StorageService(envService);
    }

    return new LocalStorageService(envService);
  },
  inject: [EnvService],
};

@Module({
  imports: [EnvModule],
  controllers: [StorageController],
  providers: [storageProvider, ImageProcessingService, LocalStorageService],
  exports: ['STORAGE_SERVICE', ImageProcessingService],
})
export class StorageModule {}

