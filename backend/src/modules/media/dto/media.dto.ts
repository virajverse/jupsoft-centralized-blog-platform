import { IsNotEmpty, IsString, IsInt, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class PresignedUrlRequestDto {
  @ApiProperty({ example: 'web-1', description: 'Tenant website ID' })
  @IsString()
  @IsNotEmpty()
  websiteId: string;

  @ApiProperty({ example: 'hero-banner.webp', description: 'File name' })
  @IsString()
  @IsNotEmpty()
  fileName: string;

  @ApiProperty({ example: 'image/webp', description: 'MIME type' })
  @IsString()
  @IsNotEmpty()
  fileType: string;

  @ApiProperty({ example: 142800, description: 'File size in bytes' })
  @IsInt()
  fileSizeBytes: number;

  @ApiProperty({ example: 'Enterprise cloud dashboard preview', required: false })
  @IsString()
  @IsOptional()
  altText?: string;
}

export class ConfirmMediaUploadDto {
  @ApiProperty({ example: 'web-1' })
  @IsString()
  @IsNotEmpty()
  websiteId: string;

  @ApiProperty({ example: 'hero-banner.webp' })
  @IsString()
  @IsNotEmpty()
  fileName: string;

  @ApiProperty({ example: 'image/webp' })
  @IsString()
  @IsNotEmpty()
  fileType: string;

  @ApiProperty({ example: 142800 })
  @IsInt()
  fileSizeBytes: number;

  @ApiProperty({ example: 'blogs/jupsoft/2026/09/hero-banner.webp' })
  @IsString()
  @IsNotEmpty()
  s3Key: string;

  @ApiProperty({ example: 'https://cdn.jupsoft.com/blogs/jupsoft/2026/09/hero-banner.webp' })
  @IsString()
  @IsNotEmpty()
  cdnUrl: string;

  @ApiProperty({ example: 'Hero image', required: false })
  @IsString()
  @IsOptional()
  altText?: string;
}
