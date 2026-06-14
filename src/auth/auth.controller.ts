import {
  Controller,
  Post,
  HttpCode,
  HttpStatus,
  Body,
  Patch,
  Get,
  Res,
  Query,
  Req,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { LoginResponseDto } from './dto/login.response.dto';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { Public } from '../jwt/public';
import { ValidationCodeDto } from './dto/validation-code.dto';
import { User } from '../users/users.entity';
import { RecoveryPasswordDto } from './dto/recovery-password.dto';
import { EmailRecoveryDto } from './dto/email-recovery.dto';
import { GoogleOpenIdService } from './google/google-openid.service';
import { Response } from 'express';
import { generators } from 'openid-client';
import { Request } from 'express';
import { PoliciesGuard } from '../casl/guard/policies.guard';
import { CheckPolicies } from '../casl/guard/check-policies';
import { AppAbility } from '../casl/casl-ability.factory';
import { Action } from '../common/entity/actionbase';
import { IJwtPayload } from '../jwt/jwt.strategy';
import { JwtAuthGuard } from '../jwt/jwt.guard';
import { VerifyMfaDto } from './mfa/dto/verify-mfa.dto';
import { MfaChallengeDto } from './mfa/dto/mfa-chanllende.dto';
import { ConfirmMfaDto } from './mfa/dto/confirm-mfa.dto';

@Controller()
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly googleOpenIdService: GoogleOpenIdService,
  ) {}

  @ApiOperation({ summary: 'Login user' })
  @ApiOkResponse({ description: 'Login user', type: LoginResponseDto })
  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto): Promise<LoginResponseDto | MfaChallengeDto> {
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

  @ApiOperation({ summary: 'Create and login with Google SSO' })
  @ApiOkResponse({ description: 'Create and login with Google SSO' })
  @Public()
  @Get('/google')
  async googleAuth(@Res() res: Response) {
    const nonce = generators.nonce();
    const state = generators.state();
    res.cookie('auth_nonce', nonce, { httpOnly: true });
    res.cookie('auth_state', state, { httpOnly: true });
    const url = this.googleOpenIdService.getAuthorizationUrl(state, nonce);
    return res.redirect(url);
  }

  @ApiOperation({ summary: 'Callback login google sso' })
  @ApiOkResponse({ description: 'Callback login sso' })
  @Public()
  @Get('auth/google/callback')
  async googleAuthRedirect(
    @Query('code') code: string,
    @Query('state') returnedState: string,
    @Req() req: Request,
  ) {
    const expectedNonce = req.cookies['auth_nonce'];
    const expectedState = req.cookies['auth_state'];
    if (returnedState !== expectedState) {
      throw new BadRequestException('Invalid state from Google callback');
    }
    const user = await this.googleOpenIdService.handleCallback(
      req,
      code,
      expectedNonce,
      returnedState,
    );
    return this.authService.validateOAuthLogin(user);
  }

  @ApiOperation({ summary: 'Initialize MFA for user (returns secret and QR code)' })
  @ApiOkResponse({ description: 'Returns MFA secret and QR code image' })
  @Post('mfa/initialize')
  @UseGuards(JwtAuthGuard, PoliciesGuard)
  @ApiBearerAuth()
  @CheckPolicies((ability: AppAbility) => ability.can(Action.UPDATE, User))
  async setupMfa(@Req() req: Request) {
    const reqUser = req.user as IJwtPayload;
    return this.authService.initializeMfa(reqUser.userId);
  }

  @ApiOperation({ summary: 'Verify MFA initialization code' })
  @ApiOkResponse({ description: 'Verifies MFA code and enables MFA for user' })
  @Post('mfa/verifyInitialize')
  @UseGuards(JwtAuthGuard, PoliciesGuard)
  @ApiBearerAuth()
  @CheckPolicies((ability: AppAbility) => ability.can(Action.UPDATE, User))
  async verifyMfa(@Req() req: IJwtPayload, @Body() body: VerifyMfaDto) {
    return this.authService.verifyMfaInitialization(req.userId, body);
  }

  @ApiOperation({ summary: 'Confirm MFA code and return accessToken' })
  @ApiOkResponse({ description: 'Confirms MFA and returns JWT accessToken' })
  @Public()
  @Post('mfa/confirm')
  @HttpCode(HttpStatus.OK)
  async confirmMfa(@Body() body: ConfirmMfaDto) {
    return this.authService.confirmMfa(body);
  }
}
