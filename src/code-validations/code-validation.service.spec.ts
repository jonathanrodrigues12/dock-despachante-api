import { Test, TestingModule } from '@nestjs/testing';
import { CodeValidationService } from './code-validation.service';
import { CodeValidationRepository } from './repositories/code-validation-repository';
import { User } from '../users/users.entity';
import { Role } from '../common/entity/rolebase';
import { AuthProvider } from '../common/enums/provider.enum';
import { AuthService } from '@/auth/auth.service';
import { BadRequestException } from '@nestjs/common';
import { AuthErrorMessage } from '@/common/error-message-base';

const mockUser: User = {
  id: '1',
  email: 'test@example.com',
  name: 'Test',
  surname: 'User',
  password: 'hashed',
  isActive: true,
  role: Role.ADMIN,
  provider: AuthProvider.LOCAL,
  codeValidations: [],
  created_at: new Date(),
  updated_at: new Date(),
};

const mockCode = '123456';

const mockAuthService = {
  sendPasswordRecoveryEmail: jest.fn(),
};

const FIXED_NOW = new Date('2024-05-10T00:00:00Z');

describe('CodeValidationService', () => {
  let service: CodeValidationService;
  let repo: any;

  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(FIXED_NOW);
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(async () => {
    repo = {
      save: jest.fn(),
      findByCode: jest.fn(),
      deleted: jest.fn(),
      update: jest.fn(),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CodeValidationService,
        { provide: CodeValidationRepository, useValue: repo },
        { provide: AuthService, useValue: mockAuthService },
      ],
    }).compile();
    service = module.get<CodeValidationService>(CodeValidationService);
  });

  it('should create a code validation', async () => {
    repo.save.mockResolvedValue({ code: mockCode, user: mockUser });
    const result = await service.create(mockUser);
    expect(result.code).toBeDefined();
    expect(result.user).toEqual(mockUser);
  });

  it('should validate code and return code validation', async () => {
    repo.findByCode.mockResolvedValue({
      user: mockUser,
      expiresIn: new Date(FIXED_NOW.getTime() + 10_000),
    });
    repo.deleted.mockResolvedValue(undefined);
    const result = await service.validate(mockCode);
    expect(result).toBeDefined();
    expect(result.user).toEqual(mockUser);
    expect(result.expiresIn).toBeInstanceOf(Date);
    expect(result.expiresIn.getTime()).toBeGreaterThan(FIXED_NOW.getTime());
  });

  it('should throw BadRequestException if code is invalid', async () => {
    repo.findByCode.mockResolvedValue(null);

    await expect(service.validate(mockCode)).rejects.toThrow(BadRequestException);
    await expect(service.validate(mockCode)).rejects.toThrow(AuthErrorMessage.INVALID_CODE);
  });

  it('should throw BadRequestException and call updateAndResendCode if code is expired', async () => {
    const expiredValidation = {
      user: mockUser,
      expiresIn: new Date(FIXED_NOW.getTime() - 10_000),
      id: 'some-id',
    };

    repo.findByCode.mockResolvedValue(expiredValidation);
    jest.spyOn(service, 'updateAndResendCode').mockResolvedValue(expiredValidation as any);
    await expect(service.validate(mockCode)).rejects.toThrow(BadRequestException);
    await expect(service.validate(mockCode)).rejects.toThrow(AuthErrorMessage.EXPIRED_CODE);

    expect(service.updateAndResendCode).toHaveBeenCalledWith(expiredValidation);
  });

  it('should call deleted', async () => {
    repo.deleted.mockResolvedValue(undefined);
    await expect(service.deleted('1')).resolves.toBeUndefined();
    expect(repo.deleted).toHaveBeenCalledWith('1');
  });
});
