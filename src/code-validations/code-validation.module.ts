import { TypeOrmModule } from '@nestjs/typeorm';
import { DatabaseModule } from '../database/database.module';
import { CodeValidation } from './code-validation.entity';
import { CodeValidationRepository } from './repositories/code-validation-repository';
import { CodeValidationService } from './code-validation.service';
import { forwardRef, Module } from '@nestjs/common';
import { AuthModule } from '@/auth/auth.module';

@Module({
  imports: [
    DatabaseModule,
    forwardRef(() => AuthModule),
    TypeOrmModule.forFeature([CodeValidation]),
  ],
  providers: [CodeValidationRepository, CodeValidationService],
  exports: [CodeValidationRepository, CodeValidationService],
})
export class CodeValidationModule {}
