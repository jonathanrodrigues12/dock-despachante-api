import { forwardRef, Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { DatabaseModule } from '../database/database.module';
import { User } from './users.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserRepository } from './repositories/user.repository';
import { CodeValidationModule } from '../code-validations/code-validation.module';
import { CaslModule } from '../casl/casl.module';
import { AuthModule } from '@/auth/auth.module';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [
    DatabaseModule,
    CaslModule,
    TypeOrmModule.forFeature([User]),
    forwardRef(() => CodeValidationModule),
    forwardRef(() => AuthModule),
    StorageModule,
  ],
  controllers: [UserController],
  providers: [UserRepository, UserService],
  exports: [UserService, UserRepository],
})
export class UserModule {}
