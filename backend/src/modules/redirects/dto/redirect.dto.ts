import { IsNotEmpty, IsString, IsInt, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateRedirectDto {
  @ApiProperty({ example: 'web-1', description: 'Tenant website ID' })
  @IsString()
  @IsNotEmpty()
  websiteId: string;

  @ApiProperty({ example: 'legacy-erp-guide', description: 'Source path to redirect from' })
  @IsString()
  @IsNotEmpty()
  fromSlug: string;

  @ApiProperty({ example: 'modern-cloud-erp-architecture', description: 'Target path to redirect to' })
  @IsString()
  @IsNotEmpty()
  toSlug: string;

  @ApiProperty({ example: 301, default: 301, required: false })
  @IsInt()
  @IsOptional()
  statusCode?: number;
}
