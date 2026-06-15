import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;
  let service: {
    login: jest.Mock;
    sendPasswordRecoveryEmail: jest.Mock;
    validateCode: jest.Mock;
    recoverUserPassword: jest.Mock;
  };

  beforeEach(async () => {
    service = {
      login: jest.fn(),
      sendPasswordRecoveryEmail: jest.fn(),
      validateCode: jest.fn(),
      recoverUserPassword: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: service }],
    }).compile();

    controller = module.get(AuthController);
  });

  describe('POST /login', () => {
    const loginDto = { email: 'user@test.com', password: '123456' };

    it('retorna accessToken e user quando credenciais válidas', async () => {
      const response = { accessToken: 'token-abc', user: { id: '1', email: loginDto.email } };
      service.login.mockResolvedValue(response);
      const result = await controller.login(loginDto as any);
      expect(service.login).toHaveBeenCalledWith(loginDto);
      expect(result).toBe(response);
    });

    it('propaga NotFoundException quando usuário não encontrado', async () => {
      service.login.mockRejectedValue(new NotFoundException());
      await expect(controller.login(loginDto as any)).rejects.toThrow(NotFoundException);
    });

    it('propaga ForbiddenException quando senha inválida', async () => {
      service.login.mockRejectedValue(new ForbiddenException());
      await expect(controller.login(loginDto as any)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('POST /send-code-recovery-password', () => {
    it('chama service com o email e resolve sem retorno', async () => {
      service.sendPasswordRecoveryEmail.mockResolvedValue(undefined);
      await controller.sendRecoveryEmail({ email: 'user@test.com' } as any);
      expect(service.sendPasswordRecoveryEmail).toHaveBeenCalledWith('user@test.com');
    });

    it('propaga NotFoundException quando email não encontrado', async () => {
      service.sendPasswordRecoveryEmail.mockRejectedValue(new NotFoundException());
      await expect(
        controller.sendRecoveryEmail({ email: 'notfound@test.com' } as any),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('POST /validate-code', () => {
    it('chama service com o código e resolve sem retorno', async () => {
      service.validateCode.mockResolvedValue(undefined);
      await controller.validateCode({ code: '123456' } as any);
      expect(service.validateCode).toHaveBeenCalledWith('123456');
    });

    it('propaga ForbiddenException quando usuário inativo', async () => {
      service.validateCode.mockRejectedValue(new ForbiddenException());
      await expect(controller.validateCode({ code: '000000' } as any)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('PATCH /recover-password', () => {
    const recoveryDto = { code: '123456', password: 'newPass123' };

    it('retorna true quando senha alterada com sucesso', async () => {
      service.recoverUserPassword.mockResolvedValue(true);
      const result = await controller.recoverPassword(recoveryDto as any);
      expect(service.recoverUserPassword).toHaveBeenCalledWith(recoveryDto);
      expect(result).toBe(true);
    });

    it('propaga NotFoundException quando código inválido', async () => {
      service.recoverUserPassword.mockRejectedValue(new NotFoundException());
      await expect(controller.recoverPassword(recoveryDto as any)).rejects.toThrow(NotFoundException);
    });
  });
});
