import { IsNotEmpty, IsString, IsOptional, IsArray, IsInt, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class BlogTranslationInputDto {
  @ApiProperty({ example: 'en' })
  @IsString()
  @IsNotEmpty()
  lang: string;

  @ApiProperty({ example: 'The AI-Powered Shift in Modern Cloud ERP' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ example: 'the-ai-powered-shift-in-modern-cloud-erp' })
  @IsString()
  @IsNotEmpty()
  slug: string;

  @ApiProperty({ example: 'How cloud ERP systems are transforming operations.' })
  @IsString()
  @IsOptional()
  excerpt?: string;

  @ApiProperty({ example: '<p>Content body in HTML or JSON format.</p>' })
  @IsString()
  @IsOptional()
  content?: string;

  // SEO fields
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  metaTitle?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  metaDescription?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  metaKeywords?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  canonicalUrl?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  focusKeyword?: string;

  @ApiProperty({ required: false, default: 'index, follow' })
  @IsString()
  @IsOptional()
  robots?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  ogTitle?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  ogDescription?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  ogImage?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  twitterTitle?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  twitterDescription?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  twitterImage?: string;
}

export class CreateBlogDto {
  @ApiProperty({ example: 'web-1', description: 'Tenant website ID' })
  @IsString()
  @IsNotEmpty()
  websiteId: string;

  @ApiProperty({ example: 'https://images.unsplash.com/...', required: false })
  @IsString()
  @IsOptional()
  featuredImage?: string;

  @ApiProperty({ example: 'Hero image description', required: false })
  @IsString()
  @IsOptional()
  featuredImageAlt?: string;

  @ApiProperty({ example: 4, required: false, default: 3 })
  @IsInt()
  @IsOptional()
  readTimeMinutes?: number;

  @ApiProperty({ example: ['cat-tech'], required: false })
  @IsArray()
  @IsOptional()
  categoryIds?: string[];

  @ApiProperty({ example: ['tag-cloud'], required: false })
  @IsArray()
  @IsOptional()
  tagIds?: string[];

  @ApiProperty({ type: [BlogTranslationInputDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BlogTranslationInputDto)
  translations: BlogTranslationInputDto[];
}

export class UpdateBlogDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  featuredImage?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  featuredImageAlt?: string;

  @ApiProperty({ required: false })
  @IsInt()
  @IsOptional()
  readTimeMinutes?: number;

  @ApiProperty({ required: false })
  @IsArray()
  @IsOptional()
  categoryIds?: string[];

  @ApiProperty({ required: false })
  @IsArray()
  @IsOptional()
  tagIds?: string[];

  @ApiProperty({ type: [BlogTranslationInputDto], required: false })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => BlogTranslationInputDto)
  translations?: BlogTranslationInputDto[];
}

export class TransitionBlogStatusDto {
  @ApiProperty({ example: 'Approved', enum: ['Draft', 'Under Review', 'Approved', 'Scheduled', 'Published', 'Archived'] })
  @IsString()
  @IsNotEmpty()
  status: string;

  @ApiProperty({ example: 'Reviewed and approved for live release.', required: false })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiProperty({ example: '2026-09-25T10:00:00Z', required: false, description: 'ISO timestamp for scheduled publishing' })
  @IsString()
  @IsOptional()
  scheduledAt?: string;
}
