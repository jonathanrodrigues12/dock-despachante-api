import { Test, TestingModule } from '@nestjs/testing';
import { S3StorageService } from './s3-storage.service';
import { EnvService } from '../../env/env.service';

const mockSend = jest.fn();

jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn().mockImplementation(() => ({ send: mockSend })),
  PutObjectCommand: jest.fn().mockImplementation((input) => ({ input })),
  DeleteObjectCommand: jest.fn().mockImplementation((input) => ({ input })),
}));

const makeEnvService = (overrides: Record<string, string> = {}): unknown => ({
  get: jest.fn((key: string) => {
    const values: Record<string, string> = {
      AWS_ACCESS_KEY_ID: 'access-key',
      AWS_SECRET_ACCESS_KEY: 'secret-key',
      AWS_REGION: 'us-east-1',
      AWS_S3_BUCKET_NAME: 'test-bucket',
      AWS_S3_BASE_URL: '',
      ...overrides,
    };
    return values[key];
  }),
});

describe('S3StorageService', () => {
  let service: S3StorageService;
  let envService: Partial<EnvService>;

  beforeEach(async () => {
    mockSend.mockReset();
    envService = makeEnvService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        S3StorageService,
        { provide: EnvService, useValue: envService as EnvService },
      ],
    }).compile();

    service = module.get<S3StorageService>(S3StorageService);
  });

  describe('uploadFile', () => {
    it('should upload and return default S3 URL', async () => {
      mockSend.mockResolvedValueOnce({});

      const url = await service.uploadFile(Buffer.from('data'), 'file.jpg', 'images', 'image/jpeg');

      expect(mockSend).toHaveBeenCalledTimes(1);
      expect(url).toBe('https://test-bucket.s3.us-east-1.amazonaws.com/images/file.jpg');
    });

    it('should use custom base URL when configured', async () => {
      envService = makeEnvService({ AWS_S3_BASE_URL: 'https://cdn.example.com' });
      const module: TestingModule = await Test.createTestingModule({
        providers: [S3StorageService, { provide: EnvService, useValue: envService as EnvService }],
      }).compile();
      service = module.get<S3StorageService>(S3StorageService);

      mockSend.mockResolvedValueOnce({});
      const url = await service.uploadFile(Buffer.from('data'), 'file.jpg', 'images');

      expect(url).toBe('https://cdn.example.com/images/file.jpg');
    });

    it('should build key without folder when folder is empty', async () => {
      mockSend.mockResolvedValueOnce({});
      const url = await service.uploadFile(Buffer.from('data'), 'file.jpg');

      expect(url).toBe('https://test-bucket.s3.us-east-1.amazonaws.com/file.jpg');
    });
  });

  describe('deleteFile', () => {
    it('should delete file by URL', async () => {
      mockSend.mockResolvedValueOnce({});
      await service.deleteFile('https://test-bucket.s3.us-east-1.amazonaws.com/images/file.jpg');

      expect(mockSend).toHaveBeenCalledTimes(1);
    });

    it('should not throw on delete error', async () => {
      mockSend.mockRejectedValueOnce(new Error('S3 error'));
      await expect(
        service.deleteFile('https://test-bucket.s3.us-east-1.amazonaws.com/images/file.jpg'),
      ).resolves.toBeUndefined();
    });
  });

  describe('getFileUrl', () => {
    it('should return S3 URL with folder', () => {
      const url = service.getFileUrl('file.jpg', 'images');
      expect(url).toBe('https://test-bucket.s3.us-east-1.amazonaws.com/images/file.jpg');
    });

    it('should return S3 URL without folder', () => {
      const url = service.getFileUrl('file.jpg');
      expect(url).toBe('https://test-bucket.s3.us-east-1.amazonaws.com/file.jpg');
    });
  });

  describe('constructor', () => {
    it('should throw if bucket name is not configured', () => {
      const badEnv = makeEnvService({ AWS_S3_BUCKET_NAME: '' });
      expect(() => new S3StorageService(badEnv as unknown as EnvService)).toThrow('AWS_S3_BUCKET_NAME is required');
    });
  });
});
