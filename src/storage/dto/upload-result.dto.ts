import { ApiProperty } from '@nestjs/swagger';

export class UploadResultDto {
  @ApiProperty({
    description: 'URL do arquivo enviado',
    example: 'https://bucket.s3.amazonaws.com/images/1234567890-abc123.jpg',
  })
  url: string;

  @ApiProperty({
    description: 'Nome do arquivo gerado',
    example: '1234567890-abc123.jpg',
  })
  fileName: string;

  @ApiProperty({
    description: 'URL do thumbnail (se gerado)',
    example: 'https://bucket.s3.amazonaws.com/images/1234567890-abc123-thumb.jpg',
    required: false,
  })
  thumbnailUrl?: string;
}

