import { Module } from '@nestjs/common';
import { TaxonomyController } from './taxonomy.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [TaxonomyController],
})
export class TaxonomyModule {}
