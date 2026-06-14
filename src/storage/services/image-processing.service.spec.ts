import { Test, TestingModule } from '@nestjs/testing';
import { ImageProcessingService } from './image-processing.service';
import { EnvService } from '../../env/env.service';

// jest.mock is hoisted — factory must be self-contained (no outer-scope variables)
jest.mock('sharp', () => {
  const toBuffer = jest.fn(() => Promise.resolve(Buffer.from('compressed')));
  const jpeg = jest.fn(() => ({ toBuffer }));
  const png = jest.fn(() => ({ toBuffer }));
  const webp = jest.fn(() => ({ toBuffer }));
  const resize = jest.fn(() => ({ jpeg, png, webp, toBuffer }));
  const instance = { resize, jpeg, png, webp, toBuffer };
  const sharp = jest.fn(() => instance);
  (sharp as any).__instance = instance;
  return sharp;
});

const makeEnvService = (overrides: Record<string, string | number> = {}): unknown => ({
  get: jest.fn((key: string) => {
    const values: Record<string, any> = {
      IMAGE_QUALITY: 80,
      IMAGE_COMPRESSION_ENABLED: 'true',
      ...overrides,
    };
    return values[key];
  }),
});

const makeFile = (mimetype = 'image/jpeg'): Express.Multer.File =>
  ({
    originalname: 'photo.jpg',
    mimetype,
    buffer: Buffer.from('image-data'),
    fieldname: 'file',
    encoding: '7bit',
    size: 100,
  } as Express.Multer.File);

describe('ImageProcessingService', () => {
  let service: ImageProcessingService;
  let storageService: { uploadFile: jest.Mock; deleteFile: jest.Mock; getFileUrl: jest.Mock };

  beforeEach(async () => {
    jest.clearAllMocks();

    // Re-configure sharp mock responses after clearAllMocks
    const sharp = jest.requireMock<any>('sharp');
    const inst = sharp.__instance;
    inst.toBuffer.mockResolvedValue(Buffer.from('compressed'));
    inst.jpeg.mockReturnValue({ toBuffer: inst.toBuffer });
    inst.png.mockReturnValue({ toBuffer: inst.toBuffer });
    inst.webp.mockReturnValue({ toBuffer: inst.toBuffer });
    inst.resize.mockReturnValue({
      jpeg: inst.jpeg,
      png: inst.png,
      webp: inst.webp,
      toBuffer: inst.toBuffer,
    });
    sharp.mockReturnValue(inst);

    storageService = {
      uploadFile: jest.fn().mockResolvedValue('https://cdn.example.com/images/file.jpg'),
      deleteFile: jest.fn(),
      getFileUrl: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ImageProcessingService,
        { provide: EnvService, useValue: makeEnvService() as unknown as EnvService },
      ],
    }).compile();

    service = module.get<ImageProcessingService>(ImageProcessingService);
  });

  describe('processAndUpload', () => {
    it('should compress jpeg, upload image and thumbnail, return URLs', async () => {
      const file = makeFile('image/jpeg');
      const result = await service.processAndUpload(file, storageService as any, 'images');

      expect(storageService.uploadFile).toHaveBeenCalledTimes(2);
      expect(result.url).toBe('https://cdn.example.com/images/file.jpg');
      expect(result.thumbnailUrl).toBe('https://cdn.example.com/images/file.jpg');
      expect(result.fileName).toMatch(/\.jpg$/);
    });

    it('should handle png mimetype', async () => {
      const file = makeFile('image/png');
      const result = await service.processAndUpload(file, storageService as any, 'images');

      expect(result.url).toBeDefined();
    });

    it('should handle webp mimetype', async () => {
      const file = makeFile('image/webp');
      const result = await service.processAndUpload(file, storageService as any, 'images');

      expect(result.url).toBeDefined();
    });

    it('should handle gif mimetype (returns original buffer)', async () => {
      const file = makeFile('image/gif');
      const result = await service.processAndUpload(file, storageService as any, 'images', {
        generateThumbnail: false,
      });

      expect(result.url).toBeDefined();
    });

    it('should skip compression when disabled', async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          ImageProcessingService,
          {
            provide: EnvService,
            useValue: makeEnvService({ IMAGE_COMPRESSION_ENABLED: 'false' }) as unknown as EnvService,
          },
        ],
      }).compile();
      const svc = module.get<ImageProcessingService>(ImageProcessingService);

      const file = makeFile('image/jpeg');
      const result = await svc.processAndUpload(file, storageService as any, 'images', {
        generateThumbnail: false,
      });

      expect(result.url).toBeDefined();
      expect(result.thumbnailUrl).toBeUndefined();
    });

    it('should skip thumbnail when generateThumbnail is false', async () => {
      const file = makeFile('image/jpeg');
      const result = await service.processAndUpload(file, storageService as any, 'images', {
        generateThumbnail: false,
      });

      expect(storageService.uploadFile).toHaveBeenCalledTimes(1);
      expect(result.thumbnailUrl).toBeUndefined();
    });

    it('should use empty buffer when file.buffer is undefined', async () => {
      const file = { ...makeFile('application/pdf'), buffer: undefined } as any;
      const result = await service.processAndUpload(file, storageService as any, 'docs', {
        generateThumbnail: false,
      });

      expect(result.url).toBeDefined();
    });
  });

  describe('processAndUploadFromBuffer', () => {
    it('should compress, upload image and thumbnail from raw buffer', async () => {
      const buffer = Buffer.from('raw-image');
      const result = await service.processAndUploadFromBuffer(
        buffer,
        'photo.jpg',
        storageService as any,
        'avatars',
      );

      expect(storageService.uploadFile).toHaveBeenCalledTimes(2);
      expect(result.url).toBeDefined();
      expect(result.thumbnailUrl).toBeDefined();
    });

    it('should skip thumbnail when generateThumbnail is false', async () => {
      const buffer = Buffer.from('raw-image');
      const result = await service.processAndUploadFromBuffer(
        buffer,
        'photo.jpg',
        storageService as any,
        'avatars',
        { generateThumbnail: false },
      );

      expect(storageService.uploadFile).toHaveBeenCalledTimes(1);
      expect(result.thumbnailUrl).toBeUndefined();
    });
  });
});
