import { ApiProperty } from '@nestjs/swagger';
import { User } from '../../users/users.entity';

export class LoginResponseDto {
  @ApiProperty()
  accessToken: string;

  @ApiProperty({ type: User })
  user: User;
}
