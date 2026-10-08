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
  Res,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
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

  private setAuthCookies(res: Response, accessToken: string, refreshToken?: string) {
    const isProduction = process.env.NODE_ENV === 'production';
    // jupsoft_auth_token: SameSite=Lax, Path=/, Max-Age=7d
    // httpOnly: false so client-side document.cookie & Next.js proxy middleware both have access
    res.cookie('jupsoft_auth_token', accessToken, {
      httpOnly: false,
      secure: isProduction,
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    if (refreshToken) {
      // jupsoft_refresh_token: httpOnly=true for security
      res.cookie('jupsoft_refresh_token', refreshToken, {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax',
        path: '/',
        maxAge: 30 * 24 * 60 * 60 * 1000,
      });
    }
  }

  private clearAuthCookies(res: Response) {
    const isProduction = process.env.NODE_ENV === 'production';
    const clearOpts = {
      path: '/',
      sameSite: 'lax' as const,
      secure: isProduction,
    };
    res.clearCookie('jupsoft_auth_token', clearOpts);
    res.clearCookie('jupsoft_refresh_token', { ...clearOpts, httpOnly: true });
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Authenticate user — returns access + refresh token pair and sets secure cookies' })
  @ApiResponse({ status: 200, description: 'Authentication successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @ApiResponse({ status: 403, description: 'Account locked (too many attempts)' })
  async login(
    @Body() dto: LoginDto,
    @Ip() ip: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const effectiveIp = (dto.clientPublicIp || ip || '').replace(/^::ffff:/, '').trim();
    const result = await this.authService.login(dto, effectiveIp);
    this.setAuthCookies(res, result.accessToken, result.refreshToken);
    return result;
  }

  @Post('google')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Authenticate via Google OAuth — only permits pre-registered active users' })
  @ApiResponse({ status: 200, description: 'Google authentication successful' })
  @ApiResponse({ status: 401, description: 'Invalid Google token or unverified email' })
  @ApiResponse({ status: 403, description: 'User not registered or account suspended' })
  async googleLogin(
    @Body() dto: GoogleLoginDto,
    @Ip() ip: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const effectiveIp = (dto.clientPublicIp || ip || '').replace(/^::ffff:/, '').trim();
    const result = await this.authService.googleLogin(dto, effectiveIp);
    this.setAuthCookies(res, result.accessToken, result.refreshToken);
    return result;
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rotate refresh token — returns new access + refresh token pair' })
  @ApiResponse({ status: 200, description: 'Tokens rotated successfully' })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
  async refresh(
    @Body() dto: RefreshTokenDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.refreshToken(dto);
    this.setAuthCookies(res, result.accessToken, result.refreshToken);
    return result;
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout — revoke refresh token in Redis (prevents replay after logout)' })
  @ApiResponse({ status: 200, description: 'Logged out — refresh token revoked' })
  @ApiResponse({ status: 401, description: 'Invalid or already-revoked refresh token' })
  async logout(
    @Body() dto: LogoutDto,
    @CurrentUser('id') userId: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.logout(dto, userId);
    this.clearAuthCookies(res);
    return result;
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

  @Put('sync-ip')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Sync client public IP to user account' })
  async syncClientIp(
    @CurrentUser('id') userId: string,
    @Body() body: { ip: string },
  ) {
    return this.authService.syncClientIp(userId, body.ip);
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

