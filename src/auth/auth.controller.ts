import {
  Controller,
  Post,
  HttpCode,
  HttpStatus,
  Body,
  Patch,
} from '@nestjs/common';
import { ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { LoginResponseDto } from './dto/login.response.dto';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { Public } from '../jwt/public';
import { ValidationCodeDto } from './dto/validation-code.dto';
import { RecoveryPasswordDto } from './dto/recovery-password.dto';
import { EmailRecoveryDto } from './dto/email-recovery.dto';

@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @ApiOperation({ summary: 'Login user' })
  @ApiOkResponse({ description: 'Login user', type: LoginResponseDto })
  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto): Promise<LoginResponseDto> {
    return await this.authService.login(loginDto);
  }

  @ApiOperation({ summary: 'Send email with code for recovery password' })
  @ApiOkResponse({ description: 'Send email with code for recovery password' })
  @Public()
  @Post('send-code-recovery-password')
  @HttpCode(HttpStatus.OK)
  async sendRecoveryEmail(@Body() EmailRecoveryDto: EmailRecoveryDto): Promise<void> {
    await this.authService.sendPasswordRecoveryEmail(EmailRecoveryDto.email);
  }

  @ApiOperation({
    summary:
      'When the user isActive field is false, indicating it is their first login, the response will include the attribute is_first: true For users who are already active, this attribute will be omitted or returned as false',
  })
  @ApiOkResponse({
    description: 'Validate code for password recovery',
    type: Boolean,
  })
  @Public()
  @Post('validate-code')
  @HttpCode(HttpStatus.OK)
  async validateCode(@Body() validationCode: ValidationCodeDto): Promise<void> {
    return await this.authService.validateCode(validationCode.code);
  }

  @ApiOperation({ summary: 'Recover user password' })
  @ApiOkResponse({ description: 'Recover user password', type: Boolean })
  @Public()
  @Patch('recover-password')
  @HttpCode(HttpStatus.OK)
  async recoverPassword(@Body() recovery: RecoveryPasswordDto): Promise<boolean> {
    return await this.authService.recoverUserPassword(recovery);
  }
}
