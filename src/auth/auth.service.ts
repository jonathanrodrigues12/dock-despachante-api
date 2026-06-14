import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import {
  ForbiddenException,
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { UserService } from '../users/user.service';
import { LoginDto } from './dto/login.dto';
import { CodeValidationService } from '../code-validations/code-validation.service';
import { User } from '../users/users.entity';
import { RecoveryPasswordDto } from './dto/recovery-password.dto';
import { LoginResponseDto } from './dto/login.response.dto';
import { SignAsyncDto } from '../jwt/dto/sign-async.dto';
import { UserErrorMessage } from '@/common/error-message-base';

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private mailer: MailerService,
    @Inject(forwardRef(() => CodeValidationService))
    private readonly codeValidationService: CodeValidationService,
    @Inject(forwardRef(() => UserService))
    private readonly userService: UserService,
  ) {}

  async login({ password, email }: LoginDto): Promise<LoginResponseDto> {
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

  async getUserById(userId: string): Promise<User> {
    const user = await this.userService.findOne(userId);
    return user;
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
}
