import { Test, TestingModule } from '@nestjs/testing';
import { MfaService } from './mfa.service';

const mockSecret = {
  ascii: 'ascii-secret',
  base32: 'BASE32SECRET',
  otpauth_url: 'otpauth://totp/App:user@test.com?secret=BASE32SECRET',
};

jest.mock('speakeasy', () => ({
  generateSecret: jest.fn(() => mockSecret),
}));

jest.mock('qrcode', () => ({
  toDataURL: jest.fn(() => Promise.resolve('data:image/png;base64,fakeqrcode')),
}));

describe('MfaService', () => {
  let service: MfaService;

  beforeEach(async () => {
    process.env.COMPANY_NAME = 'TestCompany';

    const module: TestingModule = await Test.createTestingModule({
      providers: [MfaService],
    }).compile();

    service = module.get<MfaService>(MfaService);
  });

  describe('generateSecret', () => {
    it('should return ascii, base32 and otpauthUrl', () => {
      const result = service.generateSecret('user@test.com');

      expect(result).toEqual({
        ascii: mockSecret.ascii,
        base32: mockSecret.base32,
        otpauthUrl: mockSecret.otpauth_url,
      });
    });

    it('should throw if otpauth_url is missing', () => {
      const speakeasy = require('speakeasy');
      speakeasy.generateSecret.mockReturnValueOnce({
        ascii: 'ascii',
        base32: 'base32',
        otpauth_url: undefined,
      });

      expect(() => service.generateSecret('user@test.com')).toThrow('Erro ao gerar URL do QR Code');
    });
  });

  describe('generateQrCode', () => {
    it('should return a data URL string', async () => {
      const result = await service.generateQrCode('otpauth://totp/...');

      expect(result).toBe('data:image/png;base64,fakeqrcode');
    });
  });
});
