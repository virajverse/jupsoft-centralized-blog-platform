import {
  ValidateIf, IsNotEmpty, IsString, IsOptional, IsArray, IsUrl, IsNumber, IsBoolean } from 'class-validator';
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

  @ApiProperty({ example: 'https://blogary.s3.ap-south-1.amazonaws.com/logos/default-website-logo.webp', required: false })
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
  @ValidateIf((o) => !!o.revalidateWebhookUrl)
  @IsUrl({ require_tld: false, require_protocol: true }, { message: 'revalidateWebhookUrl must be a valid URL (e.g. https://yourdomain.com/api/revalidate or http://localhost:5001/api/revalidate)' })
  @IsString()
  @IsOptional()
  revalidateWebhookUrl?: string;

  @ApiProperty({ example: 'Director Name', required: false })
  @IsString()
  @IsOptional()
  ownerName?: string;

  @ApiProperty({ example: 'director@jupsoft.com', required: false })
  @IsString()
  @IsOptional()
  ownerEmail?: string;

  @ApiProperty({ example: ['editor@jupsoft.com', 'publisher@jupsoft.com'], required: false })
  @IsArray()
  @IsOptional()
  notificationEmails?: string[];

  @ApiProperty({ example: 15, required: false, default: 15 })
  @IsNumber()
  @IsOptional()
  monthlyBlogTarget?: number;

  @ApiProperty({ example: 'monthly', required: false, default: 'monthly' })
  @IsString()
  @IsOptional()
  targetCadence?: string;

  @ApiProperty({ example: true, required: false, default: true })
  @IsBoolean()
  @IsOptional()
  targetAlertEnabled?: boolean;

  @ApiProperty({ example: [15, 25], required: false })
  @IsArray()
  @IsOptional()
  targetAlertDays?: number[];

  @ApiProperty({ example: 'weekly_monday', required: false, default: 'weekly_monday' })
  @IsString()
  @IsOptional()
  targetAlertSchedule?: string;

  @ApiProperty({ example: 'first_of_month', required: false, default: 'first_of_month' })
  @IsString()
  @IsOptional()
  digestSchedule?: string;

  @ApiProperty({ example: 'all_stakeholders', required: false, default: 'all_stakeholders' })
  @IsString()
  @IsOptional()
  recipientScope?: string;

  @ApiProperty({ example: 'https://blogary.s3.ap-south-1.amazonaws.com/blogs/default-blog-cover.webp', required: false })
  @IsString()
  @IsOptional()
  defaultCoverUrl?: string;

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

  @ApiProperty({ required: false })
  @ValidateIf((o) => !!o.revalidateWebhookUrl)
  @IsUrl({ require_tld: false, require_protocol: true }, { message: 'revalidateWebhookUrl must be a valid URL (e.g. https://yourdomain.com/api/revalidate or http://localhost:5001/api/revalidate)' })
  @IsString()
  @IsOptional()
  revalidateWebhookUrl?: string;

  @ApiProperty({ example: 'Director Name', required: false })
  @IsString()
  @IsOptional()
  ownerName?: string;

  @ApiProperty({ example: 'director@jupsoft.com', required: false })
  @IsString()
  @IsOptional()
  ownerEmail?: string;

  @ApiProperty({ example: ['editor@jupsoft.com'], required: false })
  @IsArray()
  @IsOptional()
  notificationEmails?: string[];

  @ApiProperty({ example: 15, required: false })
  @IsNumber()
  @IsOptional()
  monthlyBlogTarget?: number;

  @ApiProperty({ example: 'monthly', required: false })
  @IsString()
  @IsOptional()
  targetCadence?: string;

  @ApiProperty({ example: true, required: false })
  @IsBoolean()
  @IsOptional()
  targetAlertEnabled?: boolean;

  @ApiProperty({ example: [15, 25], required: false })
  @IsArray()
  @IsOptional()
  targetAlertDays?: number[];

  @ApiProperty({ example: 'weekly_monday', required: false })
  @IsString()
  @IsOptional()
  targetAlertSchedule?: string;

  @ApiProperty({ example: 'first_of_month', required: false })
  @IsString()
  @IsOptional()
  digestSchedule?: string;

  @ApiProperty({ example: 'all_stakeholders', required: false })
  @IsString()
  @IsOptional()
  recipientScope?: string;

  @ApiProperty({ example: 'https://blogary.s3.ap-south-1.amazonaws.com/blogs/default-blog-cover.webp', required: false })
  @IsString()
  @IsOptional()
  defaultCoverUrl?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  apiKey?: string;
}
