import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes, ApiQuery } from '@nestjs/swagger';
import { SupportService } from './support.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/interfaces/auth-user.interface';

@ApiTags('Admin / Support Tickets')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin/support/tickets')
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  /**
   * Submit a new support ticket / complaint with optional screenshot
   * Accessible by ALL roles across any tenant website (Writer, Editor, Admin, Super Admin).
   */
  @Post()
  @ApiOperation({ summary: 'Submit a new support ticket / bug complaint with screenshot' })
  @ApiConsumes('multipart/form-data', 'application/json')
  @UseInterceptors(FileInterceptor('screenshot'))
  async createTicket(
    @Body() dto: CreateTicketDto,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.supportService.createTicket(dto, file, user);
  }

  /**
   * Central Support Pool: Retrieve all tickets across all tenants
   * Super Admin ONLY.
   */
  @Get()
  @Roles('Super Admin')
  @ApiOperation({ summary: 'Central Support Pool: View all tickets across all websites (Super Admin Only)' })
  @ApiQuery({ name: 'websiteId', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async findAll(
    @Query('websiteId') websiteId?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.supportService.findAll({
      websiteId,
      status,
      search,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  /**
   * Track My Tickets: Retrieve personal tickets submitted by current user
   * Accessible by ALL roles across any tenant website (Writer, Editor, Admin, etc.).
   */
  @Get('my-tickets')
  @ApiOperation({ summary: 'Retrieve tickets submitted by current logged-in user' })
  async findMyTickets(@CurrentUser() user: AuthenticatedUser) {
    return this.supportService.findMyTickets(user);
  }

  /**
   * Get ticket counts and status distribution (Super Admin Only)
   */
  @Get('stats')
  @Roles('Super Admin')
  @ApiOperation({ summary: 'Get support ticket stats (Super Admin Only)' })
  @ApiQuery({ name: 'websiteId', required: false })
  async getStats(@Query('websiteId') websiteId?: string) {
    return this.supportService.getStats(websiteId);
  }

  /**
   * View single ticket details (Super Admin Only)
   */
  @Get(':id')
  @Roles('Super Admin')
  @ApiOperation({ summary: 'View ticket details (Super Admin Only)' })
  async findOne(@Param('id') id: string) {
    return this.supportService.findOne(id);
  }

  /**
   * Update ticket status or resolution notes (Super Admin Only)
   */
  @Patch(':id')
  @Roles('Super Admin')
  @ApiOperation({ summary: 'Update ticket status and admin notes (Super Admin Only)' })
  async updateTicket(
    @Param('id') id: string,
    @Body() dto: UpdateTicketDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.supportService.updateTicket(id, dto, user);
  }

  /**
   * Delete ticket (Super Admin Only)
   */
  @Delete(':id')
  @Roles('Super Admin')
  @ApiOperation({ summary: 'Delete a ticket (Super Admin Only)' })
  async remove(@Param('id') id: string) {
    return this.supportService.remove(id);
  }
}
