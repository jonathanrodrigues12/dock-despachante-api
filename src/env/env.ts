import { Transform, Type } from 'class-transformer';
import { IsInt, IsNumber, IsOptional, IsString } from 'class-validator';

export class Env {
  @IsOptional()
  @IsString()
  POSTGRES_TYPE: string;

  @IsOptional()
  @IsString()
  LOGO_URL: string;

  @IsOptional()
  @IsString()
  URL_SUPPORT: string;

  @IsOptional()
  @IsString()
  COMPANY_NAME: string;

  @IsOptional()
  @IsString()
  GOOGLE_CLIENT_ID: string;

  @IsOptional()
  @IsString()
  GOOGLE_CLIENT_SECRET: string;

  @IsOptional()
  @IsString()
  GOOGLE_CALLBACK_URL: string;
  @IsOptional()
  @IsString()
  POSTGRES_HOST: string;

  @IsOptional()
  @IsString()
  POSTGRES_USER: string;

  @IsOptional()
  @IsString()
  POSTGRES_PASSWORD: string;

  @IsOptional()
  @IsString()
  POSTGRES_DB: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @IsInt()
  POSTGRES_PORT: number;

  @IsString()
  DB_SOCKET: string;

  @IsOptional()
  @Transform(({ value }) => value ?? 'public')
  @IsString()
  POSTGRES_SCHEMA: string;

  @IsString()
  JWT_SECRET: string;

  @IsString()
  JWT_EXPIRES_IN: string;

  @IsOptional()
  @Transform(({ value }) => value ?? 3000)
  @Type(() => Number)
  @IsNumber()
  @IsInt()
  PORT: number;

  @IsString()
  URL_FRONT: string;

  @IsString()
  EMAIL_USERNAME: string;

  @IsString()
  EMAIL_PASSWORD: string;

  @IsString()
  EMAIL_HOST: string;

  @Type(() => Number)
  @IsNumber()
  EMAIL_PORT: number;

  @IsOptional()
  @Transform(({ value }) => value ?? 'production')
  @IsString()
  NODE_ENV: 'development' | 'production' | 'test';

}
