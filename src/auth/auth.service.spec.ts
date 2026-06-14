import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { MailerService } from '@nestjs-modules/mailer';
import { UserService } from '../users/user.service';
import { CodeValidationService } from '../code-validations/code-validation.service';
import { ForbiddenException, HttpException, NotFoundException } from '@nestjs/common';
import { Role } from '../common/entity/rolebase';
import { AuthProvider } from '../common/enums/provider.enum';
import { UserErrorMessage } from '@/common/error-message-base';
jest.mock('bcrypt', () => ({
  compare: () => Promise.resolve(true),
}));

const mockUser = {
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
  photo_url: undefined,
};

const mockCode = '123456';

describe('AuthService', () => {
  let service: AuthService;
  let jwt: any;
  let mailer: any;
  let userService: any;
  let codeValidation: any;

  beforeEach(async () => {
    jwt = { signAsync: jest.fn(), verifyAsync: jest.fn() };
    mailer = { sendMail: jest.fn() };
    userService = {
      findByEmail: jest.fn(),
      update: jest.fn(),
      changePassword: jest.fn(),
      create: jest.fn(),
      findOne: jest.fn(),
    };
    codeValidation = { create: jest.fn(), validate: jest.fn() };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: JwtService, useValue: jwt },
        { provide: MailerService, useValue: mailer },
        { provide: UserService, useValue: userService },
        { provide: CodeValidationService, useValue: codeValidation },
      ],
    }).compile();
    service = module.get<AuthService>(AuthService);
  });

  it('should login and return accessToken', async () => {
    userService.findByEmail.mockResolvedValue(mockUser);
    jwt.signAsync.mockResolvedValue('token');
    const result = await service.login({ email: mockUser.email, password: '' });
    expect(result).toHaveProperty('accessToken', 'token');
    expect(result).toHaveProperty('user');
  });

  it('should throw if user not found on login', async () => {
    userService.findByEmail.mockResolvedValue(null);
    await expect(service.login({ email: mockUser.email, password: 'pass' })).rejects.toThrow(
      HttpException,
    );
  });

  it('should throw if password is invalid', async () => {
    const bcrypt = require('bcrypt');
    userService.findByEmail.mockResolvedValue({ ...mockUser, password: 'other' });
    jest.spyOn(bcrypt, 'compare').mockImplementationOnce(() => Promise.resolve(false));
    await expect(service.login({ email: mockUser.email, password: 'wrong' })).rejects.toThrow(
      HttpException,
    );
  });

  it('should throw ForbiddenException if user is inactive', async () => {
    userService.findByEmail.mockResolvedValue({ ...mockUser, isActive: false });
    await expect(service.login({ email: mockUser.email, password: '' })).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('should send password recovery email', async () => {
    userService.findByEmail.mockResolvedValue(mockUser);
    codeValidation.create.mockResolvedValue({ code: mockCode });
    await service.sendPasswordRecoveryEmail(mockUser.email);
    expect(mailer.sendMail).toHaveBeenCalled();
  });

  it('should throw if user not found on sendPasswordRecoveryEmail', async () => {
    userService.findByEmail.mockResolvedValue(null);
    await expect(service.sendPasswordRecoveryEmail(mockUser.email)).rejects.toThrow(HttpException);
  });

  it('should recover user password', async () => {
    userService.changePassword.mockResolvedValue(mockUser);
    await expect(
      service.recoverUserPassword({
        password: 'Password123!',
        confirm_password: 'Password123!',
        code: mockCode,
      }),
    ).resolves.toBe(true);
    expect(mailer.sendMail).toHaveBeenCalled();
  });

  it('should get user by id', async () => {
    userService.findOne.mockResolvedValue(mockUser);
    await expect(service.getUserById('1')).resolves.toEqual(mockUser);
  });

  it('should throw if user not found on getUserById', async () => {
    userService.findOne.mockRejectedValue(new NotFoundException(UserErrorMessage.NOT_FOUND));
    await expect(service.getUserById('1')).rejects.toThrow(NotFoundException);
  });

  it('should verify token', async () => {
    jwt.verifyAsync.mockResolvedValue({ userId: '1' });
    await expect(service.verifyToken('token')).resolves.toEqual({ userId: '1' });
  });

  it('should sign async jwt', async () => {
    jwt.signAsync.mockResolvedValue('token');
    await expect(service.signAsyncJwt({ userId: '1', role: Role.ADMIN })).resolves.toBe('token');
  });
});
