import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsBoolean, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class UploadImageDto {
  @ApiProperty({
    required: false,
    description: 'Pasta onde a imagem será salva',
    example: 'images',
  })
  @IsOptional()
  @IsString()
  folder?: string;

  @ApiProperty({
    required: false,
    description: 'Qualidade da imagem (1-100)',
    example: 80,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  quality?: number;

  @ApiProperty({
    required: false,
    description: 'Gerar thumbnail',
    example: true,
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  generateThumbnail?: boolean;

  @ApiProperty({
    required: false,
    description: 'Largura do thumbnail',
    example: 300,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  thumbnailWidth?: number;

  @ApiProperty({
    required: false,
    description: 'Altura do thumbnail',
    example: 300,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  thumbnailHeight?: number;

  @ApiProperty({
    required: false,
    description: 'Habilitar compressão',
    example: true,
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  enableCompression?: boolean;
}

