import {
  Controller,
  Post,
  Body,
  Get,
  Put,
  UseGuards,
  Ip,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto, RefreshTokenDto, ChangePasswordDto, LogoutDto, GoogleLoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Admin / Authentication')
@Controller('admin/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @ApiOperation({ summary: 'Authenticate user — returns access + refresh token pair' })
  @ApiResponse({ status: 200, description: 'Authentication successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @ApiResponse({ status: 403, description: 'Account locked (too many attempts)' })
  async login(@Body() dto: LoginDto, @Ip() ip: string) {
    return this.authService.login(dto, ip);
  }

  @Post('google')
  @ApiOperation({ summary: 'Authenticate via Google OAuth — only permits pre-registered active users' })
  @ApiResponse({ status: 200, description: 'Google authentication successful' })
  @ApiResponse({ status: 401, description: 'Invalid Google token or unverified email' })
  @ApiResponse({ status: 403, description: 'User not registered or account suspended' })
  async googleLogin(@Body() dto: GoogleLoginDto, @Ip() ip: string) {
    return this.authService.googleLogin(dto, ip);
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Rotate refresh token — returns new access + refresh token pair' })
  @ApiResponse({ status: 200, description: 'Tokens rotated successfully' })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
  async refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshToken(dto);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout — revoke refresh token in Redis (prevents replay after logout)' })
  @ApiResponse({ status: 200, description: 'Logged out — refresh token revoked' })
  @ApiResponse({ status: 401, description: 'Invalid or already-revoked refresh token' })
  async logout(@Body() dto: LogoutDto, @CurrentUser('id') userId: string) {
    return this.authService.logout(dto, userId);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current authenticated user profile' })
  async getProfile(@CurrentUser('id') userId: string) {
    return this.authService.getProfile(userId);
  }

  @Put('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update current authenticated user profile (name, avatar, bio, linkedinUrl, twitterUrl)' })
  async updateProfile(
    @CurrentUser('id') userId: string,
    @Body() dto: { name?: string; avatar?: string; bio?: string; linkedinUrl?: string; twitterUrl?: string },
  ) {
    return this.authService.updateProfile(userId, dto);
  }

  @Post('avatar')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Upload user profile avatar with automatic WebP conversion' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async uploadAvatar(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 8 * 1024 * 1024 }),
          new FileTypeValidator({ fileType: /^image\/(jpeg|jpg|png|webp|gif|svg\+xml)$/ }),
        ],
      }),
    )
    file: Express.Multer.File,
    @CurrentUser('id') userId: string,
    @Ip() ip: string,
  ) {
    return this.authService.uploadAvatar(userId, file, ip);
  }

  @Put('change-password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change authenticated user password (requires current password)' })
  @ApiResponse({ status: 200, description: 'Password changed successfully' })
  @ApiResponse({ status: 400, description: 'Current password incorrect or same as new' })
  async changePassword(
    @Body() dto: ChangePasswordDto,
    @CurrentUser('id') userId: string,
    @Ip() ip: string,
  ) {
    return this.authService.changePassword(userId, dto, ip);
  }
}

