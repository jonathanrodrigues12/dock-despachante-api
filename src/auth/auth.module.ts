import { forwardRef, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { APP_GUARD } from '@nestjs/core';
import { EnvModule } from '../env/env.module';
import { EnvService } from '../env/env.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from '../jwt/jwt.strategy';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from '../jwt/jwt.guard';

import { CodeValidationModule } from '../code-validations/code-validation.module';
import { CaslModule } from '../casl/casl.module';
import { UserModule } from '../users/users.module';
import { CustomMailerModule } from '@/mailer/mailer.module';

@Module({
  imports: [
    CaslModule,
    PassportModule,
    CustomMailerModule,
    forwardRef(() => UserModule),
    forwardRef(() => CodeValidationModule),
    JwtModule.registerAsync({
      imports: [EnvModule],
      inject: [EnvService],
      global: true,
      useFactory: (env: EnvService) => ({
        global: true,
        secret: env.get('JWT_SECRET'),
        signOptions: { expiresIn: env.get('JWT_EXPIRES_IN') },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    JwtStrategy,
    EnvService,
    AuthService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
  exports: [AuthService],
})
export class AuthModule {}
