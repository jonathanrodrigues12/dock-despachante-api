import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from './user.service';
import { UserRepository } from './repositories/user.repository';
import { MailerService } from '@nestjs-modules/mailer';
import { CodeValidationService } from '../code-validations/code-validation.service';
import { HttpException } from '@nestjs/common';
import { AuthProvider } from '../common/enums/provider.enum';
import { Role } from '../common/entity/rolebase';

const mockUser = {
  id: '1',
  email: 'test@example.com',
  name: 'Test',
  password: 'hashed',
  provider: AuthProvider.LOCAL,
  role: Role.ADMIN,
  isActive: true,
};

const mockCode = '123456';

describe('UserService', () => {
  let service: UserService;
  let repo: any;
  let mailer: any;
  let codeValidation: any;

  beforeEach(async () => {
    repo = {
      checkIfExistsEmail: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      findAndDelete: jest.fn(),
      findAndCount: jest.fn(),
      findByEmail: jest.fn(),
    };
    mailer = { sendMail: jest.fn() };
    codeValidation = { create: jest.fn(), validate: jest.fn(), deleted: jest.fn() };
    codeValidation.validate.mockResolvedValue({ user: mockUser });
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: UserRepository, useValue: repo },
        { provide: MailerService, useValue: mailer },
        { provide: CodeValidationService, useValue: codeValidation },
      ],
    }).compile();
    service = module.get<UserService>(UserService);
  });

  it('should create a user and send email', async () => {
    repo.checkIfExistsEmail.mockResolvedValue(false);
    repo.save.mockResolvedValue(mockUser);
    codeValidation.create.mockResolvedValue({ code: mockCode });
    await expect(
      service.create(
        {
          email: mockUser.email,
          name: mockUser.name,
          surname: 'TestSurname',
          role: Role.ADMIN,
        },
        mockUser.id,
      ),
    ).resolves.toEqual(mockUser);
    expect(mailer.sendMail).toHaveBeenCalled();
  });

  it('should throw if email already exists', async () => {
    repo.checkIfExistsEmail.mockResolvedValue(true);
    await expect(
      service.create({
        email: mockUser.email,
        name: mockUser.name,
        surname: 'TestSurname',
        role: Role.ADMIN,
      }),
    ).rejects.toThrow(HttpException);
  });

  it('should find one user', async () => {
    repo.findOne.mockResolvedValue(mockUser);
    await expect(service.findOne('1')).resolves.toEqual(mockUser);
  });

  it('should throw if user not found on findOne', async () => {
    repo.findOne.mockResolvedValue(null);
    await expect(service.findOne('1')).rejects.toThrow(HttpException);
  });

  it('should delete a user', async () => {
    repo.findAndDelete.mockResolvedValue(true);
    await expect(service.deleted('1', mockUser.id)).resolves.toBe(true);
  });

  it('should throw if user not found on delete', async () => {
    repo.findAndDelete.mockResolvedValue(null);
    await expect(service.deleted('1', mockUser.id)).rejects.toThrow(HttpException);
  });

  it('should update a user', async () => {
    repo.findOne.mockResolvedValue(mockUser);
    repo.update.mockResolvedValue(mockUser);
    await expect(service.update('1', { name: 'Updated' })).resolves.toEqual(mockUser);
  });

  it('should throw if user not found on update', async () => {
    repo.findOne.mockResolvedValue(null);
    await expect(service.update('1', { name: 'Updated' })).rejects.toThrow(HttpException);
  });

  it('should throw if user not updated', async () => {
    repo.findOne.mockResolvedValue(mockUser);
    repo.update.mockResolvedValue(null);
    await expect(service.update('1', { name: 'Updated' })).rejects.toThrow(HttpException);
  });

  it('should find all users', async () => {
    repo.findAndCount.mockResolvedValue([[mockUser], 1]);
    await expect(service.findAll({} as any)).resolves.toEqual([[mockUser], 1]);
  });

  it('should check if email exists', async () => {
    repo.checkIfExistsEmail.mockResolvedValue(true);
    await expect(service.checkIfExistsEmail('test@example.com')).resolves.toBe(true);
    repo.checkIfExistsEmail.mockResolvedValue(false);
    await expect(service.checkIfExistsEmail('test@example.com')).resolves.toBe(false);
  });

  it('should find user by email', async () => {
    repo.findByEmail.mockResolvedValue(mockUser);
    await expect(service.findByEmail('test@example.com')).resolves.toEqual(mockUser);
  });

  it('should change password', async () => {
    repo.findOne.mockResolvedValue(mockUser);
    repo.update.mockResolvedValue(mockUser);
    await expect(service.changePassword('newpass', mockCode)).resolves.toEqual(mockUser);
  });

  it('should throw if user not found on changePassword', async () => {
    repo.findOne.mockResolvedValue(null);
    await expect(service.changePassword('newpass', '1')).rejects.toThrow(HttpException);
  });

  it('should throw if user not updated on changePassword', async () => {
    repo.findOne.mockResolvedValue(mockUser);
    repo.update.mockResolvedValue(null);
    await expect(service.changePassword('newpass', '1')).rejects.toThrow(HttpException);
  });
});
