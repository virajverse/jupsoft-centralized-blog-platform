import { Controller, Get, Post, Put, Delete, Body, Param, Ip, UseGuards } from '@nestjs/common';
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
  async findAll(@CurrentUser() user: any) {
    return this.usersService.findAll(user);
  }

  @Post('invite')
  @Roles('Super Admin', 'Website Admin', 'Role Admin')
  @ApiOperation({ summary: 'Invite new team member with role assignment' })
  async invite(@Body() dto: InviteUserDto, @CurrentUser() user: any, @Ip() ip: string) {
    return this.usersService.invite(dto, user, ip);
  }

  @Put(':id/role')
  @Roles('Super Admin', 'Website Admin', 'Role Admin')
  @ApiOperation({ summary: 'Modify user tenant role assignment' })
  async updateRole(
    @Param('id') id: string,
    @Body() dto: UpdateUserRoleDto,
    @CurrentUser() user: any,
    @Ip() ip: string,
  ) {
    return this.usersService.updateRole(id, dto, user, ip);
  }

  @Put(':id/status')
  @Roles('Super Admin', 'Website Admin')
  @ApiOperation({ summary: 'Toggle user account status (active / suspended)' })
  async toggleStatus(
    @Param('id') id: string,
    @Body() body: { status: string },
    @CurrentUser() user: any,
    @Ip() ip: string,
  ) {
    return this.usersService.toggleStatus(id, body.status, user, ip);
  }

  @Delete(':id')
  @Roles('Super Admin', 'Website Admin')
  @ApiOperation({ summary: 'Revoke and delete user account permanently' })
  async delete(@Param('id') id: string, @CurrentUser() user: any, @Ip() ip: string) {
    return this.usersService.delete(id, user, ip);
  }

  @Post(':id/reset-password')
  @Roles('Super Admin', 'Website Admin', 'Role Admin')
  @ApiOperation({ summary: 'Generate a new secure temporary password for a user' })
  async resetPassword(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Ip() ip: string,
  ) {
    return this.usersService.resetPassword(id, user, ip);
  }
}
