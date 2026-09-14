import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'admin@jupsoft.com', description: 'User login email' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Admin@12345', description: 'User account password' })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;
}

export class RefreshTokenDto {
  @ApiProperty({ description: 'Refresh token to obtain new access token' })
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}
