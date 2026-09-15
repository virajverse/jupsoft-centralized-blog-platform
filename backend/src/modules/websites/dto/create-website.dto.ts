import { IsNotEmpty, IsString, IsOptional, IsArray, Matches, IsUrl } from 'class-validator';
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

  @ApiProperty({ example: 'https://images.unsplash.com/...', required: false })
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

  @ApiProperty({ example: 'https://fintech.jupsoft.com/api/revalidate', required: false })
  @IsUrl({ require_tld: false, require_protocol: true }, { message: 'revalidateWebhookUrl must be a valid URL (e.g. https://yourdomain.com/api/revalidate or http://localhost:5001/api/revalidate)' })
  @IsString()
  @IsOptional()
  revalidateWebhookUrl?: string;
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

  @ApiProperty({ required: false })
  @IsUrl({ require_tld: false, require_protocol: true }, { message: 'revalidateWebhookUrl must be a valid URL (e.g. https://yourdomain.com/api/revalidate or http://localhost:5001/api/revalidate)' })
  @IsString()
  @IsOptional()
  revalidateWebhookUrl?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  apiKey?: string;
}
