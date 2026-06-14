import { ApiProperty } from '@nestjs/swagger';
export class SignAsyncDto {
  @ApiProperty()
  userId: string;
  @ApiProperty()
  role: string;
}
