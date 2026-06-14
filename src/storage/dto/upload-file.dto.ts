import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UploadFileDto {
  @ApiProperty({
    required: false,
    description: 'Pasta onde o arquivo será salvo',
    example: 'documents',
  })
  @IsOptional()
  @IsString()
  folder?: string;
}

