import { ApiProperty } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';
import { CreateUserDto } from './create-user.dto';

export class UpdateUserDto extends CreateUserDto {
  @ApiProperty({ required: false })
  @IsOptional()
  isActive?: boolean;
}
