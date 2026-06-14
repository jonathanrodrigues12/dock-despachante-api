import { Module } from '@nestjs/common';
import { LocalStorageService } from './services/local-storage.service';
import { ImageProcessingService } from './services/image-processing.service';
import { EnvModule } from '../env/env.module';
import { EnvService } from '../env/env.service';
import { StorageController } from './storage.controller';

const storageProvider = {
  provide: 'STORAGE_SERVICE',
  useFactory: (envService: EnvService): LocalStorageService => {
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
