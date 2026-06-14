// dto/confirm-mfa.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

export class ConfirmMfaDto {
  @ApiProperty()
  @IsString()
  mfaToken: string;

  @ApiProperty()
  @IsString()
  @Length(6, 6)
  code: string;
}
