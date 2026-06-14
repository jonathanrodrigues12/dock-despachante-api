import { ApiProperty } from '@nestjs/swagger';

export class MfaChallengeDto {
  @ApiProperty()
  mfaRequired: boolean;

  @ApiProperty()
  mfaToken: string;
}
