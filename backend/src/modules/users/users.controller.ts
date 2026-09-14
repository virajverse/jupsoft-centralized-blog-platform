import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { InviteUserDto, UpdateUserRoleDto } from './dto/user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Admin / Users & RBAC')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin/users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'List team members with tenant-scoped role assignments' })
  async findAll() {
    return this.usersService.findAll();
  }

  @Post('invite')
  @Roles('Super Admin')
  @ApiOperation({ summary: 'Invite organization member with role assignment (Super Admin only)' })
  async invite(@Body() dto: InviteUserDto, @CurrentUser() user: any) {
    return this.usersService.invite(dto, user);
  }

  @Put(':id/role')
  @Roles('Super Admin')
  @ApiOperation({ summary: 'Modify user tenant role assignment' })
  async updateRole(@Param('id') id: string, @Body() dto: UpdateUserRoleDto, @CurrentUser() user: any) {
    return this.usersService.updateRole(id, dto, user);
  }

  @Put(':id/status')
  @Roles('Super Admin')
  @ApiOperation({ summary: 'Toggle user account status (active / suspended)' })
  async toggleStatus(@Param('id') id: string, @Body() body: { status: string }, @CurrentUser() user: any) {
    return this.usersService.toggleStatus(id, body.status, user);
  }

  @Delete(':id')
  @Roles('Super Admin')
  @ApiOperation({ summary: 'Revoke and delete user account' })
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.usersService.delete(id, user);
  }
}
