import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class ValidationCodeDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MinLength(6, {
    message: 'Validation code must be at least 6 characters long',
  })
  @MaxLength(6, {
    message: 'Validation code must not exceed 6 characters',
  })
  code: string;
}
