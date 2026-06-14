import { BadRequestException, Injectable } from '@nestjs/common';
import { CodeValidationRepository } from './repositories/code-validation-repository';
import { CodeValidation } from './code-validation.entity';
import { generateValidationCode } from '../common/util/util';
import { User } from '../users/users.entity';
import { AuthErrorMessage } from '@/common/error-message-base';
import { AuthService } from '@/auth/auth.service';

@Injectable()
export class CodeValidationService {
  constructor(
    private readonly repo: CodeValidationRepository,
    private readonly authService: AuthService,
  ) {}

  async create(user: User, isFirst?: boolean): Promise<CodeValidation> {
    const tenMinutes = new Date();
    tenMinutes.setMinutes(tenMinutes.getMinutes() + 10);

    const codeValidation = new CodeValidation();
    codeValidation.code = generateValidationCode();
    codeValidation.expiresIn = tenMinutes;
    codeValidation.user = user;

    if (isFirst) {
      codeValidation.isFirst = isFirst;
    }

    return await this.repo.save(codeValidation);
  }

  async validate(code: string): Promise<CodeValidation> {
    const validation = await this.repo.findByCode(code);
    if (!validation) {
      throw new BadRequestException(AuthErrorMessage.INVALID_CODE);
    }

    if (validation.expiresIn < new Date()) {
      await this.updateAndResendCode(validation);
      throw new BadRequestException(AuthErrorMessage.EXPIRED_CODE);
    }
    return validation;
  }

  async deleted(userId: string): Promise<void> {
    return await this.repo.deleted(userId);
  }

  async updateAndResendCode(codeValidation: CodeValidation): Promise<CodeValidation> {
    const newCode = generateValidationCode();
    codeValidation.code = newCode;

    const tenMinutes = new Date();
    tenMinutes.setMinutes(tenMinutes.getMinutes() + 10);
    codeValidation.expiresIn = tenMinutes;

    await this.authService.sendPasswordRecoveryEmail(codeValidation.user.email, newCode);
    return await this.repo.update(codeValidation.id, {
      ...codeValidation,
      code: newCode,
      expiresIn: tenMinutes,
    });
  }
}
