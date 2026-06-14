import { Test, TestingModule } from '@nestjs/testing';
import { LocalStorageService } from './local-storage.service';
import { EnvService } from '../../env/env.service';
import * as fs from 'fs';
import * as path from 'path';

jest.mock('fs', () => ({
  existsSync: jest.fn(),
  mkdirSync: jest.fn(),
  promises: {
    writeFile: jest.fn(),
    unlink: jest.fn(),
  },
}));

const makeEnvService = (overrides: Record<string, string> = {}): unknown => ({
  get: jest.fn((key: string) => {
    const values: Record<string, string> = {
      LOCAL_STORAGE_PATH: './uploads',
      LOCAL_STORAGE_BASE_URL: '/uploads',
      ...overrides,
    };
    return values[key];
  }),
});

describe('LocalStorageService', () => {
  let service: LocalStorageService;

  beforeEach(async () => {
    jest.clearAllMocks();
    (fs.existsSync as jest.Mock).mockReturnValue(true);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LocalStorageService,
        { provide: EnvService, useValue: makeEnvService() as unknown as EnvService },
      ],
    }).compile();

    service = module.get<LocalStorageService>(LocalStorageService);
  });

  describe('uploadFile', () => {
    it('should write file and return URL with folder', async () => {
      (fs.promises.writeFile as jest.Mock).mockResolvedValueOnce(undefined);

      const url = await service.uploadFile(Buffer.from('data'), 'file.jpg', 'images', 'image/jpeg');

      expect(fs.promises.writeFile).toHaveBeenCalledWith(
        path.join('./uploads', 'images', 'file.jpg'),
        expect.any(Buffer),
      );
      expect(url).toBe('/uploads/images/file.jpg');
    });

    it('should write file and return URL without folder', async () => {
      (fs.promises.writeFile as jest.Mock).mockResolvedValueOnce(undefined);

      const url = await service.uploadFile(Buffer.from('data'), 'file.jpg');

      expect(url).toBe('/uploads/file.jpg');
    });

    it('should create target directory if it does not exist', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      (fs.promises.writeFile as jest.Mock).mockResolvedValueOnce(undefined);

      await service.uploadFile(Buffer.from('data'), 'file.jpg', 'images');

      expect(fs.mkdirSync).toHaveBeenCalledWith(
        path.join('./uploads', 'images'),
        { recursive: true },
      );
    });
  });

  describe('deleteFile', () => {
    it('should delete the file when it exists', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.promises.unlink as jest.Mock).mockResolvedValueOnce(undefined);

      await service.deleteFile('/uploads/images/file.jpg');

      expect(fs.promises.unlink).toHaveBeenCalledWith(
        path.join('./uploads', 'images/file.jpg'),
      );
    });

    it('should not call unlink when file does not exist', async () => {
      (fs.existsSync as jest.Mock)
        .mockReturnValueOnce(true) // constructor check
        .mockReturnValueOnce(false); // deleteFile check

      await service.deleteFile('/uploads/images/missing.jpg');

      expect(fs.promises.unlink).not.toHaveBeenCalled();
    });

    it('should not throw on unlink error', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.promises.unlink as jest.Mock).mockRejectedValueOnce(new Error('unlink error'));

      await expect(service.deleteFile('/uploads/file.jpg')).resolves.toBeUndefined();
    });
  });

  describe('getFileUrl', () => {
    it('should return URL with folder', () => {
      expect(service.getFileUrl('file.jpg', 'images')).toBe('/uploads/images/file.jpg');
    });

    it('should return URL without folder', () => {
      expect(service.getFileUrl('file.jpg')).toBe('/uploads/file.jpg');
    });
  });

  describe('constructor', () => {
    it('should create upload dir if it does not exist', async () => {
      (fs.existsSync as jest.Mock).mockReturnValueOnce(false);

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          LocalStorageService,
          { provide: EnvService, useValue: makeEnvService() as unknown as EnvService },
        ],
      }).compile();

      module.get<LocalStorageService>(LocalStorageService);
      expect(fs.mkdirSync).toHaveBeenCalledWith('./uploads', { recursive: true });
    });
  });
});
