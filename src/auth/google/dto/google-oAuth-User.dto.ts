import { ApiProperty } from '@nestjs/swagger';
import { AuthProvider } from '../../../common/enums/provider.enum';
import { IsEmail, IsNotEmpty } from 'class-validator';

export class OAuthGoogleUserDto {
  @ApiProperty()
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty()
  @IsNotEmpty()
  name: string;

  @ApiProperty()
  @IsNotEmpty()
  surname?: string;

  @ApiProperty()
  @IsNotEmpty()
  picture?: string;

  @ApiProperty()
  @IsNotEmpty()
  provider: AuthProvider;

  @ApiProperty()
  @IsNotEmpty()
  accessToken?: string;
}
