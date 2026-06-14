import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEnum, IsInt, IsNumber, IsOptional } from 'class-validator';

export class ParamsPagination {
  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => {
    return value ? parseInt(value) : 1;
  })
  @IsNumber()
  @IsInt()
  page: number = 1;

  @ApiPropertyOptional()
  @IsEnum([5, 10, 12, 20, 50, 100])
  @IsOptional()
  @Transform(({ value }) => (value ? parseInt(value) : 10))
  @IsNumber()
  @IsInt()
  perPage: number = 10;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => (value ? value.trim() : ''))
  search?: string;
}
