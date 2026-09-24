import {
  IsBoolean,
  IsNotEmpty,
  IsString,
  IsOptional,
  IsArray,
  IsInt,
  ValidateNested,
  IsIn,
  Matches,
  MaxLength,
  IsUrl,
  Min,
  ArrayMinSize,
  ValidateIf,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export const BLOG_STATUSES = [
  'Draft',
  'Under Review',
  'Approved',
  'Scheduled',
  'Published',
  'Archived',
] as const;
export type BlogStatusType = (typeof BLOG_STATUSES)[number];

export class BlogTranslationInputDto {
  @ApiProperty({ example: 'en' })
  @IsString()
  @IsNotEmpty()
  lang: string;

  @ApiProperty({ example: 'The AI-Powered Shift in Modern Cloud ERP' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  title: string;

  @ApiProperty({ example: 'the-ai-powered-shift-in-modern-cloud-erp' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'slug must contain only lowercase alphanumeric characters and hyphens',
  })
  slug: string;

  @ApiProperty({ example: 'How cloud ERP systems are transforming operations.' })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  excerpt?: string;

  @ApiProperty({ example: '<p>Content body in HTML or JSON format.</p>' })
  @IsString()
  @IsOptional()
  content?: string;

  // SEO fields
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  @MaxLength(120)
  metaTitle?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  @MaxLength(350)
  metaDescription?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  metaKeywords?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  @ValidateIf((o) => !!o.canonicalUrl)
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true }, { message: 'canonicalUrl must be a valid HTTP/HTTPS URL' })
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

  @ApiProperty({ example: 'https://cdn.jupsoft.com/vectors/hero-banner.svg', required: false })
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
  @Min(1)
  readTimeMinutes?: number;

  @ApiProperty({ example: ['cat-tech'], required: false })
  @IsArray()
  @IsOptional()
  categoryIds?: string[];

  @ApiProperty({ example: ['tag-cloud'], required: false })
  @IsArray()
  @IsOptional()
  tagIds?: string[];

  @ApiProperty({ example: 'Draft', required: false, enum: BLOG_STATUSES })
  @IsString()
  @IsOptional()
  @IsIn(BLOG_STATUSES)
  status?: string;

  @ApiProperty({ example: '2026-03-24T00:00:00.000Z', required: false })
  @IsDateString()
  @IsOptional()
  publishDate?: string;

  @ApiProperty({ example: 'usr-123', required: false })
  @IsString()
  @IsOptional()
  authorId?: string;

  @ApiProperty({ example: 'Aarav Sharma', required: false })
  @IsString()
  @IsOptional()
  authorName?: string;

  @ApiProperty({ example: '/uploads/avatars/avatar.webp', required: false })
  @IsString()
  @IsOptional()
  authorAvatar?: string;

  @ApiProperty({ type: [BlogTranslationInputDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => BlogTranslationInputDto)
  translations: BlogTranslationInputDto[];
}

export class UpdateBlogDto {
  @ApiProperty({ required: false })
  @IsBoolean()
  @IsOptional()
  isAutoSave?: boolean;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  websiteId?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  featuredImage?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  featuredImageAlt?: string;

  @ApiProperty({ required: false, enum: BLOG_STATUSES })
  @IsString()
  @IsOptional()
  @IsIn(BLOG_STATUSES)
  status?: string;

  @ApiProperty({ example: '2026-03-24T00:00:00.000Z', required: false })
  @IsDateString()
  @IsOptional()
  publishDate?: string;

  @ApiProperty({ example: '2026-09-25T10:00:00Z', required: false })
  @IsDateString()
  @IsOptional()
  scheduledAt?: string;

  @ApiProperty({ required: false })
  @IsInt()
  @IsOptional()
  @Min(1)
  readTimeMinutes?: number;

  @ApiProperty({ required: false })
  @IsArray()
  @IsOptional()
  categoryIds?: string[];

  @ApiProperty({ required: false })
  @IsArray()
  @IsOptional()
  tagIds?: string[];

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  authorId?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  authorName?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  authorAvatar?: string;

  @ApiProperty({ type: [BlogTranslationInputDto], required: false })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => BlogTranslationInputDto)
  translations?: BlogTranslationInputDto[];
}

export class TransitionBlogStatusDto {
  @ApiProperty({ example: 'Approved', enum: BLOG_STATUSES })
  @IsString()
  @IsNotEmpty()
  @IsIn(BLOG_STATUSES)
  status: string;

  @ApiProperty({ example: 'Reviewed and approved for live release.', required: false })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiProperty({ example: '2026-09-25T10:00:00Z', required: false, description: 'ISO timestamp for scheduled publishing' })
  @IsString()
  @IsOptional()
  scheduledAt?: string;

  @ApiProperty({ example: '2026-03-24T00:00:00.000Z', required: false, description: 'Custom/backdated publish timestamp' })
  @IsDateString()
  @IsOptional()
  publishDate?: string;
}
