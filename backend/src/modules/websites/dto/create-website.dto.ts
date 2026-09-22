import { IsNotEmpty, IsString, IsOptional, IsArray, IsUrl } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateWebsiteDto {
  @ApiProperty({ example: 'site-fintech', description: 'Unique slug / identifier' })
  @IsString()
  @IsNotEmpty()
  id: string;

  @ApiProperty({ example: 'Jupsoft FinTech Blog', description: 'Website display name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'fintech.jupsoft.com', description: 'Primary production domain' })
  @IsString()
  @IsNotEmpty()
  domain: string;

  @ApiProperty({ example: 'https://cdn.jupsoft.com/logos/site-logo.svg', required: false })
  @IsString()
  @IsOptional()
  logoUrl?: string;

  @ApiProperty({ example: 'Banking and financial tech blogs.', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 'en', required: false, default: 'en' })
  @IsString()
  @IsOptional()
  defaultLanguage?: string;

  @ApiProperty({ example: ['en', 'hi', 'fr', 'ar'], required: false })
  @IsArray()
  @IsOptional()
  supportedLanguages?: string[];

  @ApiProperty({ example: 'https://digifynext.vercel.app/api/revalidate, https://digifynext.com/api/revalidate', required: false })
  @IsString()
  @IsOptional()
  revalidateWebhookUrl?: string;

  @IsString()
  @IsOptional()
  apiKey?: string;

  @IsString()
  @IsOptional()
  s3Prefix?: string;

  @IsString()
  @IsOptional()
  status?: string;

  @IsOptional()
  createdAt?: any;
}

export class UpdateWebsiteDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  domain?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  logoUrl?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ required: false, enum: ['active', 'inactive'] })
  @IsString()
  @IsOptional()
  status?: string;

  @ApiProperty({ example: 'https://digifynext.vercel.app/api/revalidate, https://digifynext.com/api/revalidate', required: false })
  @IsString()
  @IsOptional()
  revalidateWebhookUrl?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  apiKey?: string;
}
