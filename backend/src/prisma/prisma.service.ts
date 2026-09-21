import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    const nodeEnv = process.env.NODE_ENV || 'development';
    const maxRetries = nodeEnv === 'production' ? 5 : 1;
    let lastErr: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await this.$connect();
        this.logger.log('✅ Connected to PostgreSQL via Prisma');
        await this.ensureInitialSeed();
        return; // success
      } catch (err: any) {
        lastErr = err;
        if (attempt < maxRetries) {
          const delay = attempt * 2000; // 2s, 4s, 6s, 8s, 10s
          this.logger.warn(`⚠️ PostgreSQL connection attempt ${attempt}/${maxRetries} failed. Retrying in ${delay / 1000}s... (${err.message})`);
          await new Promise((r) => setTimeout(r, delay));
        }
      }
    }

    if (nodeEnv === 'production') {
      this.logger.error(`❌ FATAL: PostgreSQL unreachable after ${maxRetries} attempts: ${lastErr?.message}. Exiting process so PM2 can restart.`);
      process.exit(1);
    } else {
      this.logger.warn(`⚠️ Warning: PostgreSQL not reachable yet. Start with docker compose up -d or verify DATABASE_URL. (${lastErr?.message})`);
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  private async ensureInitialSeed() {
    try {
      const siteCount = await this.website.count();
      if (siteCount === 0) {
        this.logger.log('🌱 Database has 0 websites. Initializing default production websites...');
        await this.website.createMany({
          data: [
            {
              id: 'site-cloud',
              name: 'Jupsoft Cloud & ERP',
              domain: 'cloud.jupsoft.com',
              logoUrl: '/uploads/logos/jupsoft-cloud-logo.webp',
              description: 'Enterprise Cloud ERP, Distributed Systems & AI Infrastructure.',
              apiKey: 'jup_live_sec_cloud_9934afbc82a104',
              s3Prefix: 'blogs/cloud/',
              status: 'active',
              defaultLanguage: 'en',
              supportedLanguages: ['en', 'hi', 'fr', 'ar'],
              revalidateWebhookUrl: 'https://cloud.jupsoft.com/api/revalidate',
            },
            {
              id: 'site-growth',
              name: 'DigifyNext Marketing',
              domain: 'digifynext.com',
              logoUrl: '/uploads/logos/digifynext-growth-logo.webp',
              description: 'Performance SEO, Conversion Funnels & Growth Marketing Analytics.',
              apiKey: 'digi_live_sec_growth_8821ecde71a209',
              s3Prefix: 'blogs/growth/',
              status: 'active',
              defaultLanguage: 'en',
              supportedLanguages: ['en', 'hi'],
              revalidateWebhookUrl: 'https://digifynext.com/api/revalidate',
            },
            {
              id: 'site-edtech',
              name: 'School ERP Platform',
              domain: 'schoolerp.in',
              logoUrl: '/uploads/logos/school-erp-logo.webp',
              description: 'Comprehensive K-12 Administration, Student Records & LMS.',
              apiKey: 'erp_live_sec_edtech_7710bba190c301',
              s3Prefix: 'blogs/edtech/',
              status: 'active',
              defaultLanguage: 'en',
              supportedLanguages: ['en', 'hi', 'ar'],
              revalidateWebhookUrl: 'https://schoolerp.in/api/revalidate',
            },
          ],
        });
        this.logger.log('✅ Initialized 3 baseline production websites');
      }

      const userCount = await this.user.count();
      if (userCount === 0) {
        this.logger.log('🌱 Database has 0 users. Initializing default SuperAdmin in PostgreSQL...');
        const passwordHash = await bcrypt.hash('Jupsoft#SuperAdmin2026!$', 10);
        await this.user.create({
          data: {
            id: 'usr-superadmin',
            name: 'Aarav Sharma (Super Admin)',
            email: 'admin@jupsoft.com',
            passwordHash,
            avatar: '/uploads/avatars/avatar-1.webp',
            status: 'active',
            lastLoginIp: '127.0.0.1',
            roleAssignments: {
              create: [
                { websiteId: null, isGlobal: true, role: 'Super Admin' },
                { websiteId: 'site-cloud', isGlobal: false, role: 'Super Admin' },
                { websiteId: 'site-growth', isGlobal: false, role: 'Super Admin' },
                { websiteId: 'site-edtech', isGlobal: false, role: 'Super Admin' },
              ],
            },
          },
        });
        this.logger.log('✅ Default SuperAdmin created: admin@jupsoft.com');
      }
    } catch (seedErr) {
      this.logger.warn(`Initial baseline check skipped: ${(seedErr as Error).message}`);
    }
  }
}
