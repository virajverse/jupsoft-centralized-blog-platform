import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { AuthenticatedUser } from '../../common/interfaces/auth-user.interface';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { join, dirname } from 'path';
import * as fs from 'fs';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const sharpFn = require('sharp');

@Injectable()
export class SupportService {
  private readonly logger = new Logger(SupportService.name);
  private s3Client?: S3Client;
  private bucket: string;
  private cdnDomain: string;
  private isLiveS3 = false;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    const region = this.configService.get<string>('AWS_REGION') || 'ap-south-1';
    const accessKeyId = this.configService.get<string>('AWS_ACCESS_KEY_ID') || '';
    const secretAccessKey = this.configService.get<string>('AWS_SECRET_ACCESS_KEY') || '';
    this.bucket = this.configService.get<string>('AWS_S3_BUCKET') || 'blogary';

    const envCdn = this.configService.get<string>('CLOUDFRONT_DOMAIN');
    const s3DirectOrigin = `https://${this.bucket}.s3.${region}.amazonaws.com`;
    this.cdnDomain = envCdn && !envCdn.includes('cdn.jupsoft.com') ? envCdn.replace(/\/+$/, '') : s3DirectOrigin;

    if (accessKeyId && secretAccessKey) {
      this.isLiveS3 = true;
      this.s3Client = new S3Client({
        region,
        credentials: { accessKeyId, secretAccessKey },
      });
    }
  }

  /**
   * Submit new support / error complaint ticket (Any authenticated tenant user)
   */
  async createTicket(
    dto: CreateTicketDto,
    file?: Express.Multer.File,
    user?: AuthenticatedUser,
  ) {
    // 1. Resolve tenant websiteId
    let websiteId = dto.websiteId;
    if (!websiteId || websiteId === 'all') {
      const userSite = user?.roleAssignments?.find((ra) => ra.websiteId)?.websiteId;
      if (userSite) {
        websiteId = userSite;
      } else {
        const defaultSite = await this.prisma.website.findFirst();
        websiteId = defaultSite ? defaultSite.id : 'site-cloud';
      }
    }

    // 2. Generate unique Ticket Number (e.g. TIK-1001)
    const count = await this.prisma.supportTicket.count();
    const ticketNumber = `TIK-${String(1001 + count).padStart(4, '0')}`;

    // 3. Process & save Screenshot if attached (Convert to WebP)
    let screenshotUrl = dto.screenshotUrl || '';
    if (file && file.buffer) {
      try {
        const uploadsDir = join(process.cwd(), 'uploads', 'support');
        if (!fs.existsSync(uploadsDir)) {
          fs.mkdirSync(uploadsDir, { recursive: true });
        }

        // Convert to WebP for maximum performance & lightweight storage
        let webpBuffer: Buffer;
        try {
          webpBuffer = await sharpFn(file.buffer)
            .webp({ quality: 85 })
            .toBuffer();
        } catch (sharpErr) {
          this.logger.warn(`Could not convert to WebP, using original buffer: ${(sharpErr as Error).message}`);
          webpBuffer = file.buffer;
        }

        const safeFileName = `${ticketNumber.toLowerCase()}-${Date.now()}.webp`;
        const localTargetPath = join(uploadsDir, safeFileName);
        fs.writeFileSync(localTargetPath, webpBuffer);
        screenshotUrl = `/uploads/support/${safeFileName}`;

        // If S3 is live, also upload to S3 bucket under support/
        if (this.isLiveS3 && this.s3Client) {
          try {
            const s3Key = `support/${safeFileName}`;
            await this.s3Client.send(
              new PutObjectCommand({
                Bucket: this.bucket,
                Key: s3Key,
                Body: webpBuffer,
                ContentType: 'image/webp',
                CacheControl: 'public, max-age=31536000, immutable',
              }),
            );
            screenshotUrl = `${this.cdnDomain}/${s3Key}`;
            this.logger.log(`Uploaded ticket screenshot to S3: ${s3Key}`);
          } catch (s3Err) {
            this.logger.warn(`S3 upload skipped for ticket screenshot, saved to disk: ${(s3Err as Error).message}`);
          }
        }

        this.logger.log(`Saved ticket screenshot as WebP: ${safeFileName} (${(webpBuffer.length / 1024).toFixed(0)} KB)`);
      } catch (err) {
        this.logger.error(`Failed to save screenshot file: ${(err as Error).message}`);
      }
    }

    // 4. Create SupportTicket record
    const ticket = await this.prisma.supportTicket.create({
      data: {
        ticketNumber,
        websiteId,
        userId: user?.id || null,
        userName: user?.name || 'Anonymous User',
        userEmail: user?.email || 'support@jupsoft.com',
        userRole: user?.roles?.[0] || 'User',
        subject: dto.subject,
        description: dto.description,
        screenshotUrl,
        pageUrl: dto.pageUrl || '',
        errorDetails: dto.errorDetails || '',
        priority: dto.priority || 'MEDIUM',
        status: 'OPEN',
      },
      include: {
        website: {
          select: { id: true, name: true, domain: true },
        },
      },
    });

    // 5. System audit log
    await this.prisma.systemAuditLog.create({
      data: {
        userName: user?.name || 'User',
        role: user?.roles?.[0] || 'User',
        websiteId,
        event: 'support.ticket_created',
        ipAddress: '',
        details: `Created Support Ticket #${ticketNumber} - "${dto.subject}"`,
      },
    }).catch(() => {});

    this.logger.log(`New Support Ticket created: #${ticketNumber} (${ticket.subject}) for website [${websiteId}] by ${ticket.userName}`);
    return ticket;
  }

  /**
   * Central Support Pool: Retrieve all tickets across all tenants (Super Admin Only)
   */
  async findAll(query: {
    websiteId?: string;
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 25));
    const skip = (page - 1) * limit;

    const where: any = {};

    if (query.websiteId && query.websiteId !== 'all') {
      where.websiteId = query.websiteId;
    }

    if (query.status && query.status !== 'all') {
      where.status = query.status.toUpperCase();
    }

    if (query.search && query.search.trim()) {
      const q = query.search.trim();
      where.OR = [
        { ticketNumber: { contains: q, mode: 'insensitive' } },
        { subject: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
        { userName: { contains: q, mode: 'insensitive' } },
        { userEmail: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [total, tickets] = await Promise.all([
      this.prisma.supportTicket.count({ where }),
      this.prisma.supportTicket.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          website: {
            select: { id: true, name: true, domain: true },
          },
        },
      }),
    ]);

    return {
      data: tickets,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Track My Tickets: Retrieve personal tickets submitted by the logged-in user
   * (Writer, Editor, Admin, etc. only see their own tickets)
   */
  async findMyTickets(user: AuthenticatedUser) {
    if (!user) return [];

    const where: any = {
      OR: [
        { userId: user.id },
        { userEmail: user.email },
      ],
    };

    return this.prisma.supportTicket.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        website: {
          select: { id: true, name: true, domain: true },
        },
      },
    });
  }

  /**
   * Get aggregate counts for header badges & dashboard stats
   */
  async getStats(websiteId?: string) {
    const where: any = {};
    if (websiteId && websiteId !== 'all') {
      where.websiteId = websiteId;
    }

    const [total, open, inProgress, resolved, closed] = await Promise.all([
      this.prisma.supportTicket.count({ where }),
      this.prisma.supportTicket.count({ where: { ...where, status: 'OPEN' } }),
      this.prisma.supportTicket.count({ where: { ...where, status: 'IN_PROGRESS' } }),
      this.prisma.supportTicket.count({ where: { ...where, status: 'RESOLVED' } }),
      this.prisma.supportTicket.count({ where: { ...where, status: 'CLOSED' } }),
    ]);

    return {
      total,
      open,
      inProgress,
      resolved,
      closed,
    };
  }

  /**
   * Find a single ticket by ID
   */
  async findOne(id: string) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id },
      include: {
        website: {
          select: { id: true, name: true, domain: true },
        },
      },
    });

    if (!ticket) {
      throw new NotFoundException(`Support ticket "${id}" not found`);
    }

    return ticket;
  }

  /**
   * Update ticket status or add resolution notes (Super Admin Only)
   */
  async updateTicket(id: string, dto: UpdateTicketDto, user: AuthenticatedUser) {
    const existing = await this.findOne(id);

    const data: any = {};
    if (dto.status) {
      data.status = dto.status.toUpperCase();
      if (['RESOLVED', 'CLOSED'].includes(data.status)) {
        data.resolvedAt = new Date();
        data.resolvedBy = user.name;
      }
    }
    if (dto.priority) {
      data.priority = dto.priority.toUpperCase();
    }
    if (dto.adminNotes !== undefined) {
      data.adminNotes = dto.adminNotes;
    }

    const updated = await this.prisma.supportTicket.update({
      where: { id },
      data,
      include: {
        website: {
          select: { id: true, name: true, domain: true },
        },
      },
    });

    await this.prisma.systemAuditLog.create({
      data: {
        userName: user.name,
        role: user.roles?.[0] || 'Super Admin',
        websiteId: updated.websiteId,
        event: 'support.ticket_updated',
        ipAddress: '',
        details: `Updated Support Ticket #${updated.ticketNumber}: status="${updated.status}"`,
      },
    }).catch(() => {});

    return updated;
  }

  /**
   * Delete ticket (Super Admin Only)
   */
  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.supportTicket.delete({ where: { id } });
  }
}
