import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTicketDto {
  @ApiProperty({ description: 'Subject or category of the issue' })
  @IsString()
  @IsNotEmpty()
  subject: string;

  @ApiProperty({ description: 'Detailed description of the issue or bug' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiPropertyOptional({ description: 'Website / Tenant ID where issue occurred' })
  @IsString()
  @IsOptional()
  websiteId?: string;

  @ApiPropertyOptional({ description: 'Current frontend page route where error occurred' })
  @IsString()
  @IsOptional()
  pageUrl?: string;

  @ApiPropertyOptional({ description: 'Optional error stack or network status details' })
  @IsString()
  @IsOptional()
  errorDetails?: string;

  @ApiPropertyOptional({ description: 'Priority: LOW | MEDIUM | HIGH | URGENT', default: 'MEDIUM' })
  @IsString()
  @IsOptional()
  priority?: string;

  @ApiPropertyOptional({ description: 'Direct screenshot URL if pre-uploaded' })
  @IsString()
  @IsOptional()
  screenshotUrl?: string;
}
