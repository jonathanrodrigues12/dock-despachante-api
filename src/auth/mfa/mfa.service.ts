import * as speakeasy from 'speakeasy';
import * as qrcode from 'qrcode';
import { Injectable } from '@nestjs/common';

@Injectable()
export class MfaService {
  generateSecret(email:string) {
    const secret = speakeasy.generateSecret({
      name: `${process.env.COMPANY_NAME} - ${email}`,
    });

    const { base32, otpauth_url: otpauthUrl, ascii } = secret;

    if (!otpauthUrl) {
      throw new Error('Erro ao gerar URL do QR Code');
    }

    return {
      ascii,
      base32,
      otpauthUrl,
    };
  }

  async generateQrCode(otpauthUrl: string): Promise<string> {
    return qrcode.toDataURL(otpauthUrl);
  }
}
