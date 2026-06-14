import { Test, TestingModule } from '@nestjs/testing';
import { GcpStorageService } from './gcp-storage.service';
import { EnvService } from '../../env/env.service';

const mockDelete = jest.fn();
const mockSave = jest.fn();
const mockMakePublic = jest.fn();
const mockFile = jest.fn(() => ({ save: mockSave, makePublic: mockMakePublic, delete: mockDelete }));
const mockBucket = jest.fn(() => ({ file: mockFile }));

jest.mock('@google-cloud/storage', () => ({
  Storage: jest.fn().mockImplementation(() => ({
    bucket: mockBucket,
  })),
}));

const makeEnvService = (overrides: Record<string, string> = {}): unknown => ({
  get: jest.fn((key: string) => {
    const values: Record<string, string> = {
      GCP_PROJECT_ID: 'test-project',
      GCP_KEY_FILENAME: '',
      GCP_BUCKET_NAME: 'test-bucket',
      GCP_CREDENTIALS: '',
      ...overrides,
    };
    return values[key];
  }),
});

describe('GcpStorageService', () => {
  let service: GcpStorageService;

  beforeEach(async () => {
    mockSave.mockReset();
    mockMakePublic.mockReset();
    mockDelete.mockReset();
    mockSave.mockResolvedValue(undefined);
    mockMakePublic.mockResolvedValue(undefined);
    mockDelete.mockResolvedValue(undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GcpStorageService,
        { provide: EnvService, useValue: makeEnvService() as unknown as EnvService },
      ],
    }).compile();

    service = module.get<GcpStorageService>(GcpStorageService);
  });

  describe('uploadFile', () => {
    it('should upload and return public GCS URL', async () => {
      const url = await service.uploadFile(Buffer.from('data'), 'file.jpg', 'images', 'image/jpeg');

      expect(mockSave).toHaveBeenCalledWith(
        expect.any(Buffer),
        expect.objectContaining({ contentType: 'image/jpeg' }),
      );
      expect(mockMakePublic).toHaveBeenCalledTimes(1);
      expect(url).toBe('https://storage.googleapis.com/test-bucket/images/file.jpg');
    });

    it('should build URL without folder', async () => {
      const url = await service.uploadFile(Buffer.from('data'), 'file.jpg');

      expect(url).toBe('https://storage.googleapis.com/test-bucket/file.jpg');
    });
  });

  describe('deleteFile', () => {
    it('should delete file by URL', async () => {
      await service.deleteFile('https://storage.googleapis.com/test-bucket/images/file.jpg');

      expect(mockFile).toHaveBeenCalledWith('images/file.jpg');
      expect(mockDelete).toHaveBeenCalledTimes(1);
    });

    it('should not throw on delete error', async () => {
      mockDelete.mockRejectedValueOnce(new Error('GCP error'));
      await expect(
        service.deleteFile('https://storage.googleapis.com/test-bucket/file.jpg'),
      ).resolves.toBeUndefined();
    });
  });

  describe('getFileUrl', () => {
    it('should return correct GCS URL with folder', () => {
      expect(service.getFileUrl('file.jpg', 'images')).toBe(
        'https://storage.googleapis.com/test-bucket/images/file.jpg',
      );
    });

    it('should return correct GCS URL without folder', () => {
      expect(service.getFileUrl('file.jpg')).toBe(
        'https://storage.googleapis.com/test-bucket/file.jpg',
      );
    });
  });

  describe('constructor', () => {
    it('should throw if bucket name is not configured', () => {
      const badEnv = makeEnvService({ GCP_BUCKET_NAME: '' });
      expect(() => new GcpStorageService(badEnv as unknown as EnvService)).toThrow('GCP_BUCKET_NAME is required');
    });

    it('should use keyFilename when provided', () => {
      const { Storage } = require('@google-cloud/storage');
      const envWithKey = makeEnvService({ GCP_KEY_FILENAME: '/path/to/key.json' });
      new GcpStorageService(envWithKey as unknown as EnvService);
      expect(Storage).toHaveBeenCalledWith(
        expect.objectContaining({ keyFilename: '/path/to/key.json' }),
      );
    });

    it('should use credentials JSON when GCP_CREDENTIALS is provided', () => {
      const { Storage } = require('@google-cloud/storage');
      const creds = JSON.stringify({ type: 'service_account' });
      const envWithCreds = makeEnvService({ GCP_KEY_FILENAME: '', GCP_CREDENTIALS: creds });
      new GcpStorageService(envWithCreds as unknown as EnvService);
      expect(Storage).toHaveBeenCalledWith(
        expect.objectContaining({ credentials: { type: 'service_account' } }),
      );
    });
  });
});
