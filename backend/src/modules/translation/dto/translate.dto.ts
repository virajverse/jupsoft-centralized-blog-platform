import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TranslateDto {
  @ApiPropertyOptional({ description: 'Blog title to translate' })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({ description: 'Blog HTML content or text to translate' })
  @IsString()
  @IsOptional()
  content?: string;

  @ApiPropertyOptional({ description: 'Blog excerpt to translate' })
  @IsString()
  @IsOptional()
  excerpt?: string;

  @ApiPropertyOptional({ description: 'Raw single text string to translate' })
  @IsString()
  @IsOptional()
  text?: string;

  @ApiProperty({ example: 'en', description: 'Source language code (e.g. en)' })
  @IsString()
  @IsNotEmpty()
  from: string;

  @ApiProperty({ example: 'hi', description: 'Target language code (e.g. hi, fr, ar)' })
  @IsString()
  @IsNotEmpty()
  to: string;
}
