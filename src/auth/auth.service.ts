import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import {
  BadRequestException,
  ForbiddenException,
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { UserService } from '../users/user.service';
import { LoginDto } from './dto/login.dto';
import { CodeValidationService } from '../code-validations/code-validation.service';
import { User } from '../users/users.entity';
import { RecoveryPasswordDto } from './dto/recovery-password.dto';
import { Role } from '../common/entity/rolebase';
import { OAuthGoogleUserDto } from './google/dto/google-oAuth-User.dto';
import { LoginResponseDto } from './dto/login.response.dto';
import { MfaChallengeDto } from './mfa/dto/mfa-chanllende.dto';
import { SignAsyncDto } from '../jwt/dto/sign-async.dto';
import { AuthErrorMessage, UserErrorMessage } from '@/common/error-message-base';
import { ConfirmMfaDto } from './mfa/dto/confirm-mfa.dto';
import * as speakeasy from 'speakeasy';
import { VerifyMfaDto } from './mfa/dto/verify-mfa.dto';
import { MfaService } from './mfa/mfa.service';

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private mailer: MailerService,
    @Inject(forwardRef(() => CodeValidationService))
    private readonly codeValidationService: CodeValidationService,
    @Inject(forwardRef(() => UserService))
    private readonly userService: UserService,

    private readonly mfaService: MfaService,
  ) {}

  async login({ password, email }: LoginDto): Promise<LoginResponseDto | MfaChallengeDto> {
    const user = await this.userService.findByEmail(email);
    if (!user) {
      throw new NotFoundException(UserErrorMessage.NOT_FOUND);
    }
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new ForbiddenException(UserErrorMessage.INVALID_CREDENTIALS);
    }

    if (!user.isActive) {
      throw new ForbiddenException(UserErrorMessage.NOT_ACTIVE);
    }

    if (user.mfaEnabled) {
      const payloadmfa = {
        userId: user.id,
        role: user.role,
        mfa: true,
      };
      const mfaToken = await this.jwtService.signAsync({ payload: payloadmfa, expiresIn: '5m' });

      return {
        mfaRequired: true,
        mfaToken,
      };
    }

    const payload = {
      userId: user.id,
      role: user.role,
    };
    const token = await this.jwtService.signAsync(payload);
    return {
      accessToken: token,
      user,
    };
  }

  async sendPasswordRecoveryEmail(email: string, code?: string): Promise<void> {
    const user = await this.userService.findByEmail(email);

    if (!user) {
      throw new NotFoundException(UserErrorMessage.NOT_FOUND);
    }

    const recoveryCode = code || (await this.codeValidationService.create(user));

    try {
      this.mailer.sendMail({
        to: user.email,
        subject: 'Recovery Password',
        template: './recovery-password-email-template',
        context: {
          code: recoveryCode,
          name: user.name,
          logoUrl: process.env.LOGO_URL,
          companyName: process.env.COMPANY_NAME || '',
        },
      });
    } catch (err) {
      console.error('Error sending email:', err);
    }
  }

  async validateCode(code: string): Promise<void> {
    const userValidation = await this.codeValidationService.validate(code);

    if (userValidation.isFirst) {
      userValidation.user.isActive = true;
      await this.userService.update(userValidation.user.id, userValidation.user);
      return;
    }

    if (!userValidation.user.isActive) {
      throw new ForbiddenException(UserErrorMessage.NOT_ACTIVE);
    }

    return;
  }

  async recoverUserPassword(recovery: RecoveryPasswordDto): Promise<boolean> {
    const userRecovery = await this.userService.changePassword(recovery.password, recovery.code);
    this.mailer.sendMail({
      to: userRecovery.email,
      subject: 'Your password has been changed',
      template: './change-password-email-template',
      context: {
        email: userRecovery.email,
        name: userRecovery.name,
        logoUrl: process.env.LOGO_URL,
        companyName: process.env.COMPANY_NAME || '',
        url_support: process.env.URL_SUPPORT || '',
      },
    });
    return true;
  }
  async validateOAuthLogin(
    oauthUser: OAuthGoogleUserDto,
  ): Promise<{ accessToken: string; user: User }> {
    let user = await this.userService.findByEmail(oauthUser.email);
    if (!user) {
      user = await this.userService.create({
        email: oauthUser.email,
        name: oauthUser.name,
        surname: oauthUser.surname || '',
        photo_url: oauthUser.picture,
        provider: oauthUser.provider,
        role: Role.ADMIN,
      });
    } else {
      const updates: Partial<User> = {};
      if (!user.provider) updates.provider = oauthUser.provider;
      if (!user.photo_url && oauthUser.picture) updates.photo_url = oauthUser.picture;
      if (!user.surname && oauthUser.surname) updates.surname = oauthUser.surname;
      if (Object.keys(updates).length > 0) {
        await this.userService.update(user.id, updates);
        user = { ...user, ...updates };
      }
    }

    const payload = {
      userId: user.id,
      role: user.role,
    };
    const token = await this.jwtService.signAsync(payload);

    return {
      accessToken: token,
      user,
    };
  }

  async setMfaSecret(userId: string, secret: string): Promise<void> {
    await this.userService.update(userId, {
      mfaSecret: secret,
    });
  }

  async getUserById(userId: string): Promise<User> {
    const user = await this.userService.findOne(userId);
    return user;
  }

  async enableMfa(userId: string): Promise<void> {
    await this.userService.update(
      userId,
      {
        mfaEnabled: true,
      },
      userId,
    );
  }

  async verifyToken(mfaToken: string): Promise<any> {
    return await this.jwtService.verifyAsync(mfaToken);
  }

  async signAsyncJwt(signAsync: SignAsyncDto) {
    return await this.jwtService.signAsync({
      userId: signAsync.userId,
      role: signAsync.role,
    });
  }

  async initializeMfa(userId: string) {
    const user = await this.getUserById(userId);
    if (!user) {
      throw new NotFoundException(UserErrorMessage.NOT_FOUND);
    }

    const { base32, otpauthUrl } = this.mfaService.generateSecret(user.email);
    const qrCodeImageUrl = await this.mfaService.generateQrCode(otpauthUrl);

    await this.setMfaSecret(user.id, base32);

    return {
      secret: base32,
      qrCodeImageUrl,
    };
  }

  async verifyMfaInitialization(userId: string, body: VerifyMfaDto) {
    const { token } = body;

    const user = await this.getUserById(userId);
    if (!user || !user.mfaSecret || user.mfaEnabled) {
      throw new BadRequestException(AuthErrorMessage.MFA_ALREADY_ENABLED);
    }

    const isValid = speakeasy.totp.verify({
      secret: user.mfaSecret,
      encoding: 'base32',
      token,
      window: 2,
    });

    if (!isValid) {
      throw new UnauthorizedException(AuthErrorMessage.INVALID_MFA_CODE);
    }

    await this.enableMfa(user.id);

    return { success: true, message: 'MFA ativado com sucesso.' }; // Isso aqui pode ser ajustado/removido dependendo da implementação do seu front-end
  }

  async confirmMfa(body: ConfirmMfaDto) {
    const { mfaToken, code } = body;

    const { payload } = await this.verifyToken(mfaToken);
    if (!payload?.userId || !payload?.mfa) {
      throw new UnauthorizedException(AuthErrorMessage.INVALID_MFA_TOKEN);
    }

    const user = await this.getUserById(payload.userId);
    if (!user || !user.mfaEnabled || !user.mfaSecret) {
      throw new BadRequestException(AuthErrorMessage.MFA_NOT_CONFIGURED);
    }

    const isValid = speakeasy.totp.verify({
      secret: user.mfaSecret,
      encoding: 'base32',
      token: code,
      window: 1,
    });

    if (!isValid) {
      throw new UnauthorizedException(AuthErrorMessage.INVALID_MFA_CODE);
    }

    const signPayload = {
      userId: user.id,
      role: user.role,
    };

    const accessToken = await this.signAsyncJwt(signPayload);

    return {
      accessToken,
      user,
    };
  }
}
