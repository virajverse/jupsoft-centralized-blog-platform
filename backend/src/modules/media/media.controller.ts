/**
 * Media Controller — TRD §10 (Media Management Module)
 *
 * Endpoints:
 *   POST /admin/media/upload          → Multipart upload with WebP conversion (TRD §10 Steps 2-5)
 *   POST /admin/media/presigned-url   → Client-side S3 presigned URL (TRD §10 Step 1)
 *   POST /admin/media/confirm         → Register client-uploaded asset
 *   GET  /admin/media                 → Media library list
 *   DELETE /admin/media/:id           → Soft-delete asset (TRD §10 Step 6)
 */

import {
  Controller, Get, Post, Delete, Body, Param, Query,
  UseGuards, UseInterceptors, UploadedFile, ParseFilePipe,
  MaxFileSizeValidator, FileTypeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { MediaService } from './media.service';
import { PresignedUrlRequestDto, ConfirmMediaUploadDto } from './dto/media.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/interfaces/auth-user.interface';

@ApiTags('Admin / Media')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin/media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  /**
   * TRD §10: "Compress and convert to WebP, Generate thumbnail + responsive sizes"
   * Server-side upload: receives multipart file, processes via sharp, uploads to S3.
   */
  @Post('upload')
  @ApiOperation({ summary: 'Upload image — server converts to WebP + generates thumbnail & medium sizes (TRD §10)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        websiteId: { type: 'string' },
        altText: { type: 'string' },
      },
      required: ['file', 'websiteId'],
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          // TRD §10: max 10MB
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }),
          new FileTypeValidator({ fileType: /^image\/(jpeg|jpg|png|webp|gif)$/ }),
        ],
      }),
    )
    file: Express.Multer.File,
    @Query('websiteId') websiteId: string,
    @Query('altText') altText: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.mediaService.processAndUpload(
      file.buffer,
      file.originalname,
      file.mimetype,
      websiteId,
      altText || '',
      user,
    );
  }

  @Post('presigned-url')
  @ApiOperation({ summary: 'Issue AWS S3 presigned PUT URL for client-side upload (TRD §10 Step 1)' })
  async generatePresignedUrl(@Body() dto: PresignedUrlRequestDto) {
    return this.mediaService.generatePresignedUrl(dto);
  }

  @Post('confirm')
  @ApiOperation({ summary: 'Register client-uploaded media asset metadata into database' })
  async confirmUpload(@Body() dto: ConfirmMediaUploadDto, @CurrentUser() user: AuthenticatedUser) {
    return this.mediaService.confirmUpload(dto, user);
  }

  @Get()
  @ApiOperation({ summary: 'Retrieve media asset library filtered by website tenant' })
  @ApiQuery({ name: 'websiteId', required: false })
  async findAll(@Query('websiteId') websiteId?: string) {
    return this.mediaService.findAll(websiteId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete media asset (TRD §10: soft-delete with lifecycle cleanup)' })
  async delete(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.mediaService.delete(id, user);
  }
}
