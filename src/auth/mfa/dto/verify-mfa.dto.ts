import { IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
export class VerifyMfaDto {
  @ApiProperty()
  @IsString()
  @Length(6, 6)
  token: string;
}
