import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ description: 'Registered work email address' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'Account password (min 6 chars)' })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @ApiPropertyOptional({ description: 'Optional client public IP detected on browser' })
  @IsOptional()
  @IsString()
  clientPublicIp?: string;
}

export class RefreshTokenDto {
  @ApiProperty({ description: 'Refresh token to obtain new access + refresh token pair' })
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}

export class ChangePasswordDto {
  @ApiProperty({ description: 'Current account password for verification' })
  @IsString()
  @IsNotEmpty()
  currentPassword: string;

  @ApiProperty({ description: 'New password (min 8 chars)' })
  @IsString()
  @MinLength(8)
  newPassword: string;
}

export class LogoutDto {
  @ApiProperty({ description: 'Refresh token to invalidate on logout' })
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}

export class GoogleLoginDto {
  @ApiProperty({ description: 'Google ID token (credential) from Google Identity Services' })
  @IsString()
  @IsNotEmpty()
  credential: string;

  @ApiPropertyOptional({ description: 'Optional client public IP detected on browser' })
  @IsOptional()
  @IsString()
  clientPublicIp?: string;
}

export class ForgotPasswordDto {
  @ApiProperty({ description: 'Registered work email address to request password reset' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiPropertyOptional({ description: 'Optional client public IP detected on browser' })
  @IsOptional()
  @IsString()
  clientPublicIp?: string;
}

export class ResetPasswordDto {
  @ApiProperty({ description: 'Cryptographic password reset token received via email' })
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiProperty({ description: 'New account password (min 8 characters)' })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  newPassword: string;

  @ApiPropertyOptional({ description: 'Optional client public IP detected on browser' })
  @IsOptional()
  @IsString()
  clientPublicIp?: string;
}

export class ValidateResetTokenDto {
  @ApiProperty({ description: 'Cryptographic password reset token to validate' })
  @IsString()
  @IsNotEmpty()
  token: string;
}

