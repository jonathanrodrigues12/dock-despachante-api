import { ApiProperty } from '@nestjs/swagger';

export enum AuthErrorMessage {
  INVALID_CODE = 'Invalid code',
  EXPIRED_CODE = 'Expired code',
}

export enum UserErrorMessage {
  NOT_FOUND = 'User not found',
  NOT_ADMIN = 'User is not an admin',
  NOT_UPDATED = 'User not updated',
  NOT_ACTIVE = 'User is not active',
  EMAIL_ALREADY_IN_USE = 'Email already in use',
  INVALID_CREDENTIALS = 'Invalid credentials',
}

export class ErrorMessage {
  @ApiProperty({ enum: AuthErrorMessage })
  auth: AuthErrorMessage;

  @ApiProperty({ enum: UserErrorMessage })
  user: UserErrorMessage;
}
