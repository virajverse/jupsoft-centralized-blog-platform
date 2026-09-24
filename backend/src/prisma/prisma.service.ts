import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('✅ Connected to PostgreSQL via Prisma');
      await this.ensureInitialSeed();
    } catch (err: any) {
      this.logger.warn(`⚠️ Warning: PostgreSQL not reachable yet: ${err?.message}. Prisma will reconnect lazily on incoming requests.`);
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  /**
   * Bootstrap secrets: never hardcode credentials.
   * Priority: explicit env var → secure random value (printed ONCE for the operator).
   */
  private resolveSeedSecret(envKey: string, buildValue: () => string): { value: string; generated: boolean } {
    const fromEnv = process.env[envKey]?.trim();
    if (fromEnv) return { value: fromEnv, generated: false };
    return { value: buildValue(), generated: true };
  }

  private async ensureInitialSeed() {
    try {
      const siteCount = await this.website.count();
      if (siteCount === 0) {
        this.logger.log('🌱 Database has 0 websites. Initializing default production websites...');

        const cloudKey = this.resolveSeedSecret('SEED_API_KEY_SITE_CLOUD', () => `jup_live_sec_cloud_${crypto.randomBytes(16).toString('hex')}`);
        const growthKey = this.resolveSeedSecret('SEED_API_KEY_SITE_GROWTH', () => `jup_live_sec_growth_${crypto.randomBytes(16).toString('hex')}`);
        const edtechKey = this.resolveSeedSecret('SEED_API_KEY_SITE_EDTECH', () => `jup_live_sec_edtech_${crypto.randomBytes(16).toString('hex')}`);

        await this.website.createMany({
          data: [
            {
              id: 'site-cloud',
              name: 'Jupsoft Cloud & ERP',
              domain: 'cloud.jupsoft.com',
              logoUrl: '/uploads/logos/jupsoft-cloud-logo.webp',
              description: 'Enterprise Cloud ERP, Distributed Systems & AI Infrastructure.',
              apiKey: cloudKey.value,
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
              apiKey: growthKey.value,
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
              apiKey: edtechKey.value,
              s3Prefix: 'blogs/edtech/',
              status: 'active',
              defaultLanguage: 'en',
              supportedLanguages: ['en', 'hi', 'ar'],
              revalidateWebhookUrl: 'https://schoolerp.in/api/revalidate',
            },
          ],
        });
        this.logger.log('✅ Initialized 3 baseline production websites');

        const generatedKeys = [
          ['site-cloud', 'SEED_API_KEY_SITE_CLOUD', cloudKey],
          ['site-growth', 'SEED_API_KEY_SITE_GROWTH', growthKey],
          ['site-edtech', 'SEED_API_KEY_SITE_EDTECH', edtechKey],
        ].filter(([, , k]: any) => k.generated);
        if (generatedKeys.length > 0) {
          this.logger.warn(
            `🔑 Generated tenant API keys (shown ONCE — copy them now, or set the SEED_API_KEY_* env vars before first boot): ` +
              generatedKeys.map(([id, envKey, k]: any) => `${id}=${k.value} (${envKey})`).join(' | '),
          );
        }
      }

      const userCount = await this.user.count();
      if (userCount === 0) {
        this.logger.log('🌱 Database has 0 users. Initializing default SuperAdmin in PostgreSQL...');

        const adminSecret = this.resolveSeedSecret('SEED_SUPERADMIN_PASSWORD', () => {
          const raw = crypto.randomBytes(18).toString('base64url');
          return `Jup-${raw}!`;
        });

        const passwordHash = await bcrypt.hash(adminSecret.value, 12);
        await this.user.create({
          data: {
            id: 'usr-superadmin',
            name: 'Sachin Sharma (Super Admin)',
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
        if (adminSecret.generated) {
          this.logger.warn(
            `🔑 Generated Super Admin password for admin@jupsoft.com (shown ONCE — change after first login, or set SEED_SUPERADMIN_PASSWORD before first boot): ${adminSecret.value}`,
          );
        }
      }
    } catch (seedErr) {
      this.logger.warn(`Initial baseline check skipped: ${(seedErr as Error).message}`);
    }
  }
}
