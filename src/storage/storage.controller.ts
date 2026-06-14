import {
  Controller,
  Post,
  Delete,
  Get,
  Query,
  UploadedFile,
  UseInterceptors,
  Body,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Inject } from '@nestjs/common';
import { ApiConsumes, ApiOkResponse, ApiOperation, ApiTags, ApiBody } from '@nestjs/swagger';
import { IStorageService, UploadResult } from './interfaces/storage.interface';
import { ImageProcessingService } from './services/image-processing.service';
import { UploadResultDto } from './dto/upload-result.dto';
import { UploadFileDto } from './dto/upload-file.dto';
import { UploadImageDto } from './dto/upload-image.dto';
import { Public } from '../jwt/public';
import { BadRequestException } from '@nestjs/common';

@ApiTags('storage-test')
@Controller('storage-test')
export class StorageController {
  constructor(
    @Inject('STORAGE_SERVICE')
    private readonly storageService: IStorageService,
    private readonly imageProcessingService: ImageProcessingService,
  ) {}

  @ApiOperation({
    summary: 'Upload de arquivo simples (sem processamento)',
    description: 'Faz upload de um arquivo diretamente para o storage configurado (S3 ou GCP)',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Arquivo a ser enviado (aceita qualquer tipo de arquivo)',
        },
        folder: {
          type: 'string',
          description: 'Pasta onde o arquivo será salvo (opcional)',
          example: 'documents',
        },
      },
    },
  })
  @ApiOkResponse({
    description: 'URL do arquivo enviado',
    schema: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          example: 'https://bucket.s3.amazonaws.com/documents/file.jpg',
        },
        fileName: {
          type: 'string',
          example: '1234567890-abc123.jpg',
        },
      },
    },
  })
  @Public()
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
      },
    }),
  )
  @Post('upload')
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body() uploadDto: UploadFileDto,
  ): Promise<{ url: string; fileName: string }> {
    if (!file) {
      throw new Error('Arquivo não fornecido');
    }

    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const originalExtension = file.originalname.split('.').pop();
    const fileName = `${timestamp}-${randomString}.${originalExtension}`;

    const url = await this.storageService.uploadFile(
      file.buffer,
      fileName,
      uploadDto.folder || 'uploads',
      file.mimetype,
    );

    return {
      url,
      fileName,
    };
  }

  @ApiOperation({
    summary: 'Upload de imagem com processamento',
    description:
      'Faz upload de uma imagem com processamento automático (redimensionamento, compressão, thumbnail)',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Imagem a ser enviada (aceita: PNG, JPEG, JPG)',
        },
        folder: {
          type: 'string',
          description: 'Pasta onde a imagem será salva (opcional)',
          example: 'images',
        },
        quality: {
          type: 'number',
          description: 'Qualidade da imagem (1-100, opcional)',
          example: 80,
        },
        generateThumbnail: {
          type: 'boolean',
          description: 'Gerar thumbnail (opcional, padrão: true)',
          example: true,
        },
        thumbnailWidth: {
          type: 'number',
          description: 'Largura do thumbnail (opcional, padrão: 300)',
          example: 300,
        },
        thumbnailHeight: {
          type: 'number',
          description: 'Altura do thumbnail (opcional, padrão: 300)',
          example: 300,
        },
        enableCompression: {
          type: 'boolean',
          description: 'Habilitar compressão (opcional)',
          example: true,
        },
      },
    },
  })
  @ApiOkResponse({
    description: 'Resultado do upload com processamento',
    type: UploadResultDto,
  })
  @Public()
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
      },
    }),
  )
  @Post('upload-image')
  async uploadImage(
    @UploadedFile() file: Express.Multer.File,
    @Body() uploadDto: UploadImageDto,
  ): Promise<UploadResult> {
    if (!file) {
      throw new BadRequestException('Arquivo não fornecido');
    }

    const options: {
      quality?: number;
      generateThumbnail?: boolean;
      thumbnailWidth?: number;
      thumbnailHeight?: number;
      enableCompression?: boolean;
    } = {};

    if (uploadDto.quality !== undefined) {
      options.quality = uploadDto.quality;
    }

    if (uploadDto.generateThumbnail !== undefined) {
      options.generateThumbnail = uploadDto.generateThumbnail;
    }

    if (uploadDto.thumbnailWidth !== undefined) {
      options.thumbnailWidth = uploadDto.thumbnailWidth;
    }

    if (uploadDto.thumbnailHeight !== undefined) {
      options.thumbnailHeight = uploadDto.thumbnailHeight;
    }

    if (uploadDto.enableCompression !== undefined) {
      options.enableCompression = uploadDto.enableCompression;
    }

    return this.imageProcessingService.processAndUpload(
      file,
      this.storageService,
      uploadDto.folder || 'images',
      options,
    );
  }

  @ApiOperation({
    summary: 'Obter URL de um arquivo',
    description: 'Gera a URL de um arquivo sem fazer upload (útil para verificar URLs)',
  })
  @ApiOkResponse({
    description: 'URL do arquivo',
    schema: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          example: 'https://bucket.s3.amazonaws.com/images/file.jpg',
        },
      },
    },
  })
  @Public()
  @Get('url')
  async getFileUrl(
    @Query('fileName') fileName: string,
    @Query('folder') folder?: string,
  ): Promise<{ url: string }> {
    if (!fileName) {
      throw new Error('Nome do arquivo não fornecido');
    }

    const url = this.storageService.getFileUrl(fileName, folder);
    return { url };
  }

  @ApiOperation({
    summary: 'Deletar um arquivo',
    description: 'Remove um arquivo do storage usando sua URL completa',
  })
  @ApiOkResponse({
    description: 'Arquivo deletado com sucesso',
    schema: {
      type: 'object',
      properties: {
        success: {
          type: 'boolean',
          example: true,
        },
        message: {
          type: 'string',
          example: 'Arquivo deletado com sucesso',
        },
      },
    },
  })
  @Public()
  @Delete('file')
  async deleteFile(@Query('url') url: string): Promise<{ success: boolean; message: string }> {
    if (!url) {
      throw new Error('URL do arquivo não fornecida');
    }

    await this.storageService.deleteFile(url);
    return {
      success: true,
      message: 'Arquivo deletado com sucesso',
    };
  }

  @ApiOperation({
    summary: 'Informações do storage configurado',
    description: 'Retorna informações sobre qual storage está sendo usado (S3 ou GCP)',
  })
  @ApiOkResponse({
    description: 'Informações do storage',
    schema: {
      type: 'object',
      properties: {
        storageType: {
          type: 'string',
          example: 's3',
        },
      },
    },
  })
  @Public()
  @Get('info')
  async getStorageInfo(): Promise<{ storageType: string }> {
    const storageType = this.storageService.constructor.name.includes('Gcp') ? 'gcp' : 's3';

    return {
      storageType,
    };
  }
}
