import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserModule } from './users/users.module';
import { DatabaseModule } from './database/database.module';
import { CodeValidationModule } from './code-validations/code-validation.module';
import { CustomMailerModule } from './mailer/mailer.module';
import { EnvModule } from './env/env.module';
import { AuthModule } from './auth/auth.module';
import { CaslModule } from './casl/casl.module';
import { VehicleDebtsModule } from './vehicle-debts/vehicle-debts.module';
@Module({
  imports: [
    DatabaseModule,
    UserModule,
    CodeValidationModule,
    CustomMailerModule,
    EnvModule,
    AuthModule,
    CaslModule,
    VehicleDebtsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
