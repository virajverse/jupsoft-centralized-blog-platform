import { IsString, IsOptional, IsIn } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateTicketDto {
  @ApiPropertyOptional({ description: 'Ticket status: OPEN | IN_PROGRESS | RESOLVED | CLOSED' })
  @IsString()
  @IsOptional()
  @IsIn(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'])
  status?: string;

  @ApiPropertyOptional({ description: 'Priority: LOW | MEDIUM | HIGH | URGENT' })
  @IsString()
  @IsOptional()
  @IsIn(['LOW', 'MEDIUM', 'HIGH', 'URGENT'])
  priority?: string;

  @ApiPropertyOptional({ description: 'Internal admin resolution notes' })
  @IsString()
  @IsOptional()
  adminNotes?: string;
}
