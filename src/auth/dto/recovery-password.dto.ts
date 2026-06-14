import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, Matches, MinLength } from 'class-validator';
export class RecoveryPasswordDto {
  @ApiProperty()
  @IsNotEmpty()
  code: string;

  @ApiProperty()
  @MinLength(8, {
    message:
      'Your password must be at least 8 characters long and include uppercase letters, lowercase letters, and special characters.',
  })
  @IsNotEmpty({ message: 'Password is required' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*[\W_]).{8,}$/, {
    message:
      'Your password must be at least 8 characters long and include uppercase letters, lowercase letters, and special characters.',
  })
  password: string;

  @ApiProperty()
  @IsNotEmpty({ message: 'Confirm password is required' })
  @MinLength(8, {
    message:
      'Your password must be at least 8 characters long and include uppercase letters, lowercase letters, and special characters.',
  })
  @IsNotEmpty({ message: 'Confirm Password is required' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*[\W_]).{8,}$/, {
    message:
      'Your password must be at least 8 characters long and include uppercase letters, lowercase letters, and special characters.',
  })
  confirm_password: string;
}
