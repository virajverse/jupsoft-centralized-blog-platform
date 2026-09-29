import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { LoginDto, RefreshTokenDto, ChangePasswordDto, LogoutDto, GoogleLoginDto } from './dto/login.dto';
import { RedisProvider } from '../../common/providers/redis.provider';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import * as fs from 'fs';
import { join } from 'path';

const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

// Redis key prefix for revoked refresh tokens
// Value: '1', TTL = JWT_REFRESH_EXPIRATION seconds (so old keys auto-expire)
const REVOKED_TOKEN_PREFIX = 'auth:revoked_rt:';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private redis: RedisProvider,
  ) {}

  private get jwtSecret(): string {
    const secret = this.configService.get<string>('JWT_SECRET');
    if (!secret) throw new Error('[SECURITY] JWT_SECRET is not configured');
    return secret;
  }

  private get jwtRefreshSecret(): string {
    const secret = this.configService.get<string>('JWT_REFRESH_SECRET');
    if (!secret) throw new Error('[SECURITY] JWT_REFRESH_SECRET is not configured');
    return secret;
  }

  private get jwtExpiration(): string {
    return this.configService.get<string>('JWT_EXPIRATION') || '15m';
  }

  private get jwtRefreshExpiration(): string {
    return this.configService.get<string>('JWT_REFRESH_EXPIRATION') || '30d';
  }

  async login(dto: LoginDto, ipAddress: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
      include: {
        roleAssignments: {
          include: { website: true },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (user.status !== 'active') {
      throw new UnauthorizedException('This account has been suspended');
    }

    // --- Brute Force Protection ---
    if (user.lockoutUntil && user.lockoutUntil > new Date()) {
      const remaining = Math.ceil((user.lockoutUntil.getTime() - Date.now()) / 60000);
      throw new ForbiddenException(
        `Account locked due to too many failed attempts. Try again in ${remaining} minute(s).`,
      );
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);

    if (!isPasswordValid) {
      const newAttempts = user.loginAttempts + 1;
      const shouldLock = newAttempts >= MAX_LOGIN_ATTEMPTS;

      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          loginAttempts: newAttempts,
          lockoutUntil: shouldLock ? new Date(Date.now() + LOCKOUT_DURATION_MS) : null,
        },
      });

      if (shouldLock) {
        throw new ForbiddenException(
          'Too many failed login attempts. Account locked for 15 minutes.',
        );
      }

      throw new UnauthorizedException(
        `Invalid email or password. ${MAX_LOGIN_ATTEMPTS - newAttempts} attempt(s) remaining.`,
      );
    }

    // --- Success: reset lockout counters ---
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginIp: ipAddress || '',
        loginAttempts: 0,
        lockoutUntil: null,
      },
    });

    await this.prisma.systemAuditLog.create({
      data: {
        userName: user.name,
        role: user.roleAssignments[0]?.role || 'Staff Writer',
        websiteId: 'system',
        event: 'user.login',
        ipAddress: ipAddress || '',
        details: `User ${user.name} (${user.email}) logged in from ${ipAddress || 'unknown'}.`,
      },
    });

    const roles = user.roleAssignments.map((r) => r.role);
    const payload = { sub: user.id, email: user.email, roles };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.jwtSecret,
      expiresIn: this.jwtExpiration as any,
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.jwtRefreshSecret,
      expiresIn: this.jwtRefreshExpiration as any,
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        status: user.status,
        roles,
        customModules: user.customModules || [],
        roleAssignments: user.roleAssignments.reduce((acc, curr) => {
          const key = curr.isGlobal || !curr.websiteId ? 'all' : curr.websiteId;
          acc[key] = curr.role;
          return acc;
        }, {} as Record<string, string>),
      },
    };
  }

  // ─── Google OAuth Sign-In (Strict Whitelist: existing users only) ───────────
  async googleLogin(dto: GoogleLoginDto, ipAddress: string) {
    if (!dto.credential) {
      throw new BadRequestException('Google credential token is required');
    }

    // 1. Verify token with Google's OAuth2 verification endpoint (with 6s timeout)
    let googleUser: any;
    try {
      const res = await fetch(
        `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(dto.credential)}`,
        { signal: AbortSignal.timeout(6000) },
      );
      if (!res.ok) {
        const errData: any = await res.json().catch(() => ({}));
        throw new UnauthorizedException(errData.error_description || 'Invalid Google credential token');
      }
      googleUser = await res.json();
    } catch (err: any) {
      if (err instanceof UnauthorizedException) throw err;
      if (err?.name === 'TimeoutError' || err?.name === 'AbortError') {
        throw new UnauthorizedException('Google authentication verification timed out. Please try again.');
      }
      throw new UnauthorizedException(`Failed to verify Google token: ${err.message}`);
    }

    // 2. Validate Token Issuer (iss)
    if (
      googleUser.iss !== 'accounts.google.com' &&
      googleUser.iss !== 'https://accounts.google.com'
    ) {
      this.logger.warn(`Google token invalid issuer: ${googleUser.iss}`);
      throw new UnauthorizedException('Invalid Google token issuer');
    }

    // 3. Validate Token Expiration (exp)
    if (googleUser.exp && Number(googleUser.exp) < Math.floor(Date.now() / 1000)) {
      throw new UnauthorizedException('Google token has expired');
    }

    const email = (googleUser.email || '').toLowerCase().trim();
    const isEmailVerified = googleUser.email_verified === 'true' || googleUser.email_verified === true;

    if (!email || !isEmailVerified) {
      throw new UnauthorizedException('Google account email is not verified by Google');
    }

    // 4. Verify Google Client ID (aud) if configured in backend environment
    const configuredClientId = this.configService.get<string>('GOOGLE_CLIENT_ID');
    if (configuredClientId) {
      const allowedClientIds = configuredClientId.split(',').map((id) => id.trim()).filter(Boolean);
      if (allowedClientIds.length > 0 && (!googleUser.aud || !allowedClientIds.includes(googleUser.aud))) {
        this.logger.warn(
          `Google token audience mismatch: expected one of [${allowedClientIds.join(', ')}], got ${googleUser.aud}`,
        );
        throw new UnauthorizedException('Google client ID mismatch');
      }
    }

    // 2. STRICT WHITELIST: User MUST already exist in database
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: {
        roleAssignments: {
          include: { website: true },
        },
      },
    });

    if (!user) {
      throw new ForbiddenException(
        `Access denied: No registered account found for "${email}". Only pre-registered team members can sign in with Google.`,
      );
    }

    if (user.status !== 'active') {
      throw new UnauthorizedException('This account has been suspended. Please contact your Super Admin.');
    }

    // 3. Success: Reset lockout, update IP, and AUTOMATICALLY sync latest Name & Avatar from Google
    let jwtPayload: any = {};
    try {
      jwtPayload = this.jwtService.decode(dto.credential) || {};
    } catch {
      jwtPayload = {};
    }

    const syncName = (googleUser.name || jwtPayload.name || '').trim();
    const syncAvatar = (
      googleUser.picture ||
      jwtPayload.picture ||
      googleUser.avatar ||
      jwtPayload.avatar ||
      ''
    ).trim();

    this.logger.log(
      `Google OAuth profile sync for ${email}: name="${syncName}", avatar="${syncAvatar ? syncAvatar.substring(0, 60) + '...' : 'none'}"`,
    );

    const updateData: any = {
      lastLoginIp: ipAddress || '',
      loginAttempts: 0,
      lockoutUntil: null,
    };
    if (syncName) {
      updateData.name = syncName;
    }
    if (syncAvatar) {
      updateData.avatar = syncAvatar;
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: user.id },
      data: updateData,
      include: { roleAssignments: true },
    });

    await this.redis.del(`auth:user:${user.id}`);
    await this.redis.del(`auth:profile:${user.id}`);

    await this.prisma.systemAuditLog.create({
      data: {
        userName: updatedUser.name,
        role: updatedUser.roleAssignments[0]?.role || 'Staff Writer',
        websiteId: 'system',
        event: 'user.login.google',
        ipAddress: ipAddress || '',
        details: `User ${updatedUser.name} (${updatedUser.email}) signed in via Google OAuth from ${ipAddress || 'unknown'} (profile automatically synced).`,
      },
    });

    const roles = user.roleAssignments.map((r) => r.role);
    const payload = { sub: user.id, email: user.email, roles };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.jwtSecret,
      expiresIn: this.jwtExpiration as any,
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.jwtRefreshSecret,
      expiresIn: this.jwtRefreshExpiration as any,
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        avatar: updatedUser.avatar || '',
        status: user.status,
        roles,
        customModules: user.customModules || [],
        roleAssignments: user.roleAssignments.reduce((acc, curr) => {
          const key = curr.isGlobal || !curr.websiteId ? 'all' : curr.websiteId;
          acc[key] = curr.role;
          return acc;
        }, {} as Record<string, string>),
      },
    };
  }

  async refreshToken(dto: RefreshTokenDto) {
    // ── Step 1: Check if this refresh token has been revoked (logout) ──────
    const tokenHash = crypto.createHash('sha256').update(dto.refreshToken).digest('hex');
    const isRevoked = await this.redis.get<string>(`${REVOKED_TOKEN_PREFIX}${tokenHash}`);
    if (isRevoked) {
      throw new UnauthorizedException('Refresh token has been revoked. Please log in again.');
    }

    // ── Step 2: Verify signature and expiry ───────────────────────────────
    let payload: any;
    try {
      payload = this.jwtService.verify(dto.refreshToken, {
        secret: this.jwtRefreshSecret,
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { roleAssignments: true },
    });

    if (!user || user.status !== 'active') {
      throw new UnauthorizedException('User account not found or suspended');
    }

    // ── Step 3: Revoke the OLD refresh token (token rotation — one-time use) ──
    const refreshTtlSeconds = this.parseExpirationToSeconds(this.jwtRefreshExpiration);
    await this.redis.set(
      `${REVOKED_TOKEN_PREFIX}${tokenHash}`,
      '1',
      refreshTtlSeconds,
    );

    const roles = user.roleAssignments.map((r) => r.role);
    const newPayload = { sub: user.id, email: user.email, roles };

    const accessToken = this.jwtService.sign(newPayload, {
      secret: this.jwtSecret,
      expiresIn: this.jwtExpiration as any,
    });

    const newRefreshToken = this.jwtService.sign(newPayload, {
      secret: this.jwtRefreshSecret,
      expiresIn: this.jwtRefreshExpiration as any,
    });

    return { accessToken, refreshToken: newRefreshToken };
  }

  /**
   * Logout — invalidates the refresh token by adding its SHA-256 hash to
   * the Redis revocation set. The entry auto-expires after the refresh token TTL.
   * This prevents the token from being used for token rotation after logout.
   */
  async logout(dto: LogoutDto, userId: string) {
    const tokenHash = crypto.createHash('sha256').update(dto.refreshToken).digest('hex');
    const refreshTtlSeconds = this.parseExpirationToSeconds(this.jwtRefreshExpiration);

    // Verify the token belongs to this user (prevent others from revoking tokens they don't own)
    try {
      const payload = this.jwtService.verify(dto.refreshToken, {
        secret: this.jwtRefreshSecret,
      });
      if (payload.sub !== userId) {
        throw new UnauthorizedException('Cannot revoke a token belonging to another user');
      }
    } catch (err: any) {
      // If already expired, still mark as revoked so it can't be replayed before expiry window
      if (err?.name !== 'TokenExpiredError') {
        throw new UnauthorizedException('Invalid refresh token provided for logout');
      }
    }

    await this.redis.set(`${REVOKED_TOKEN_PREFIX}${tokenHash}`, '1', refreshTtlSeconds);

    await this.prisma.systemAuditLog.create({
      data: {
        userName: 'User',
        role: 'User',
        websiteId: 'system',
        event: 'user.logout',
        ipAddress: '',
        details: `User ${userId} logged out and revoked refresh token.`,
      },
    });

    return { success: true, message: 'Logged out successfully. Refresh token revoked.' };
  }

  async getProfile(userId: string) {
    const cacheKey = `auth:profile:${userId}`;
    const cached = await this.redis.get<any>(cacheKey);
    if (cached) return cached;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        status: true,
        lastLoginIp: true,
        customModules: true,
        roleAssignments: {
          select: {
            isGlobal: true,
            websiteId: true,
            role: true,
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const profile = {
      id: user.id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      status: user.status,
      lastLoginIp: user.lastLoginIp,
      customModules: user.customModules || [],
      roleAssignments: user.roleAssignments.reduce((acc, curr) => {
        const key = curr.isGlobal || !curr.websiteId ? 'all' : curr.websiteId;
        acc[key] = curr.role;
        return acc;
      }, {} as Record<string, string>),
    };

    // Cache profile for 60 seconds (0-delay for fast multi-tab navigations)
    await this.redis.set(cacheKey, profile, 60);

    return profile;
  }

  async changePassword(userId: string, dto: ChangePasswordDto, ipAddress: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const isCurrentPasswordValid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!isCurrentPasswordValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    if (dto.newPassword === dto.currentPassword) {
      throw new BadRequestException('New password must be different from current password');
    }

    const newPasswordHash = await bcrypt.hash(dto.newPassword, 12);

    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newPasswordHash },
    });

    await this.redis.del(`auth:profile:${userId}`);

    await this.prisma.systemAuditLog.create({
      data: {
        userName: user.name,
        role: 'User',
        websiteId: 'system',
        event: 'user.password_changed',
        ipAddress: ipAddress || '',
        details: `User ${user.name} (${user.email}) changed their password.`,
      },
    });

    return { success: true, message: 'Password changed successfully' };
  }

  async updateProfile(userId: string, dto: { name?: string; avatar?: string }) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const updateData: any = {};
    if (dto.name && dto.name.trim()) updateData.name = dto.name.trim();
    if (dto.avatar !== undefined) updateData.avatar = dto.avatar.trim();

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: updateData,
      include: { roleAssignments: true },
    });

    await this.redis.del(`auth:profile:${userId}`);
    await this.redis.del(`auth:user:${userId}`);

    return {
      id: updated.id,
      name: updated.name,
      email: updated.email,
      avatar: updated.avatar,
      status: updated.status,
      customModules: updated.customModules || [],
      roleAssignments: updated.roleAssignments.reduce((acc, curr) => {
        const key = curr.isGlobal || !curr.websiteId ? 'all' : curr.websiteId;
        acc[key] = curr.role;
        return acc;
      }, {} as Record<string, string>),
    };
  }

  async uploadAvatar(userId: string, file: Express.Multer.File, ipAddress?: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { roleAssignments: true },
    });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (!file || !file.buffer) {
      throw new BadRequestException('Image file buffer is required');
    }

    let webpBuffer: Buffer;
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const sharpLib = require('sharp');
      const sharpFn = (buf: Buffer) => (typeof sharpLib === 'function' ? sharpLib(buf) : sharpLib.default(buf));

      // Convert any uploaded image to WebP (300x300 square crop, high quality)
      webpBuffer = await sharpFn(file.buffer)
        .rotate()
        .resize(300, 300, { fit: 'cover', position: 'center' })
        .webp({ quality: 85, effort: 4 })
        .toBuffer();
    } catch (err: any) {
      throw new BadRequestException(`Invalid or corrupt image file: ${err.message}`);
    }

    const fileName = `avatar-${userId}-${Date.now()}.webp`;
    const uploadsDir = join(process.cwd(), 'uploads', 'avatars');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    const localFilePath = join(uploadsDir, fileName);
    fs.writeFileSync(localFilePath, webpBuffer);
    this.logger.log(`💾 Saved profile avatar locally in WebP: ${fileName}`);

    let avatarUrl = `/uploads/avatars/${fileName}`;

    // S3 upload if configured
    const accessKey = this.configService.get<string>('AWS_ACCESS_KEY_ID') || '';
    const bucket = this.configService.get<string>('AWS_S3_BUCKET') || 'jupsoft-blogs-storage';
    if (accessKey && !accessKey.startsWith('mock_')) {
      try {
        const region = this.configService.get<string>('AWS_REGION') || 'ap-south-1';
        const secretAccessKey = this.configService.get<string>('AWS_SECRET_ACCESS_KEY') || '';
        const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');
        const s3 = new S3Client({ region, credentials: { accessKeyId: accessKey, secretAccessKey } });
        await s3.send(new PutObjectCommand({
          Bucket: bucket,
          Key: `avatars/${fileName}`,
          Body: webpBuffer,
          ContentType: 'image/webp',
        }));
        const envCdn = this.configService.get<string>('CLOUDFRONT_DOMAIN');
        if (envCdn && !envCdn.includes('cdn.jupsoft.com')) {
          avatarUrl = `${envCdn.replace(/\/+$/, '')}/avatars/${fileName}`;
        }
      } catch (err: any) {
        this.logger.warn(`Could not upload avatar to S3, using local: ${err.message}`);
      }
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { avatar: avatarUrl },
      include: { roleAssignments: true },
    });

    // Cascade avatar update to all blogs authored by this user
    const cleanName = updated.name.replace(/\s*\([^)]*(?:admin|editor|author|superadmin|user)[^)]*\)/gi, '').trim();
    try {
      await this.prisma.blog.updateMany({
        where: {
          OR: [
            { authorId: userId },
            { authorName: { equals: updated.name, mode: 'insensitive' } },
            { authorName: { equals: cleanName, mode: 'insensitive' } },
            ...(cleanName.toLowerCase().includes('sachin') ? [{ authorName: { contains: 'Sachin', mode: 'insensitive' as const } }] : []),
          ],
        },
        data: { authorAvatar: avatarUrl },
      });
      this.logger.log(`🔄 Cascaded updated avatar to all blogs authored by ${updated.name} (${userId})`);
    } catch (e: any) {
      this.logger.warn(`Failed to cascade avatar to blogs: ${e.message}`);
    }

    await this.redis.del(`auth:user:${userId}`);
    await this.redis.del(`auth:profile:${userId}`);
    await this.redis.delPattern('blog:*');
    await this.redis.delPattern('blogs:*');
    await this.redis.delPattern('admin:blogs:*');

    await this.prisma.systemAuditLog.create({
      data: {
        userName: updated.name,
        role: updated.roleAssignments[0]?.role || 'Staff Writer',
        websiteId: 'system',
        event: 'user.avatar_updated',
        ipAddress: ipAddress || '',
        details: `User ${updated.name} (${updated.email}) uploaded new profile photo (auto-converted to WebP, ${(webpBuffer.length / 1024).toFixed(1)} KB).`,
      },
    });

    return {
      success: true,
      avatar: avatarUrl,
      user: {
        id: updated.id,
        name: updated.name,
        email: updated.email,
        avatar: avatarUrl,
        status: updated.status,
      },
    };
  }

  /**
   * Parse expiration strings like '30d', '15m', '1h' into seconds for Redis TTL.
   */
  private parseExpirationToSeconds(exp: string): number {
    const match = exp.match(/^(\d+)([smhd])$/);
    if (!match) return 60 * 60 * 24 * 30; // default 30 days
    const value = parseInt(match[1], 10);
    const unit = match[2];
    const multipliers: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 };
    return value * (multipliers[unit] || 1);
  }
}