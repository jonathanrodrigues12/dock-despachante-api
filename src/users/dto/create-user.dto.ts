import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional } from 'class-validator';
import { Role } from '../../common/entity/rolebase';
import { AuthProvider } from '../../common/enums/provider.enum';

export class CreateUserDto {
  @ApiProperty()
  @IsNotEmpty({ message: 'Name is required' })
  name: string;

  @ApiProperty()
  @IsNotEmpty({ message: 'Surname is required' })
  surname: string;

  @ApiProperty({ required: false, type: 'string', format: 'binary' })
  @IsOptional()
  photo?: any;

  @ApiProperty({ required: false })
  @IsOptional()
  photo_url?: string;

  @ApiProperty()
  @IsEmail({ allow_display_name: false }, { message: 'Email valid required' })
  @IsNotEmpty({ message: 'Email is required' })
  email: string;

  @ApiProperty({ enum: Role, default: Role.ADMIN, required: true })
  @IsNotEmpty()
  role: Role;

  @ApiProperty({ enum: AuthProvider, required: false, default: AuthProvider.LOCAL })
  provider?: AuthProvider;

  // @ApiProperty()
  // @MinLength(8, {
  //   message:
  //     'Your password must be at least 8 characters long and include uppercase letters, lowercase letters, and special characters.',
  // })

  // @IsNotEmpty({ message: 'Password is required' })
  // @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*[\W_]).{8,}$/, {
  //   message:
  //     'Your password must be at least 8 characters long and include uppercase letters, lowercase letters, and special characters.',
  // })
  // password: string;
}
