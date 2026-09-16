import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TranslationService } from './translation.service';
import { TranslateDto } from './dto/translate.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Admin / AI Translation')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin')
export class TranslationController {
  constructor(private readonly translationService: TranslationService) {}

  @Post('translate')
  @Roles('Super Admin', 'Website Admin', 'Role Admin', 'Editor', 'Content Writer')
  @ApiOperation({ summary: 'Real-time multi-language translation for blog titles, excerpts, and rich HTML' })
  async translate(@Body() dto: TranslateDto) {
    return this.translationService.translate(dto);
  }
}
