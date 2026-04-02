import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { PublishPrismaService } from '../prisma/prisma.service';
import { WordPressAdapter } from '../infrastructure/wordpress.adapter';
import { FacebookAdapter } from '../infrastructure/facebook.adapter';
import { ShopifyAdapter } from '../infrastructure/shopify.adapter';
import { BufferAdapter } from '../infrastructure/buffer.adapter';
import { PublishStatus, Platform } from '@prisma-client/distribution-hub';
import { PublishPayload } from '../domain/adapters/publisher.adapter.interface';

interface ContentData {
  id: string;
  title?: string;
  body: string;
  imageUrl?: string;
  platform: string;
  status: string;
}

@Injectable()
export class PublishContentService {
  private readonly logger = new Logger(PublishContentService.name);
  private readonly internalBase: string;

  constructor(
    private readonly prisma: PublishPrismaService,
    private readonly wordPressAdapter: WordPressAdapter,
    private readonly facebookAdapter: FacebookAdapter,
    private readonly shopifyAdapter: ShopifyAdapter,
    private readonly bufferAdapter: BufferAdapter,
    private readonly http: HttpService,
    config: ConfigService,
  ) {
    this.internalBase = config.get<string>('BACKEND_INTERNAL_URL', 'http://localhost:3000');
  }

  async publish(publishLogId: string): Promise<void> {
    // 1. Load publish log
    const log = await this.prisma.publishLog.findUnique({ where: { id: publishLogId } });
    if (!log) throw new Error(`PublishLog ${publishLogId} not found`);

    // 2. Mark as publishing
    await this.prisma.publishLog.update({
      where: { id: publishLogId },
      data: { status: PublishStatus.PUBLISHING },
    });

    try {
      // 3. Fetch content via internal REST
      const contentRes = await firstValueFrom(
        this.http.get<ContentData>(`${this.internalBase}/api/internal/content/${log.contentId}`),
      );
      const content = contentRes.data;

      const payload: PublishPayload = {
        title: content.title,
        body: content.body,
        imageUrl: content.imageUrl,
      };

      // 4. Route to adapter
      const adapter = this.getAdapter(log.platform);
      const targetPlatform = String(log.platform).startsWith('BUFFER_')
        ? String(log.platform).replace('BUFFER_', '').toLowerCase()
        : undefined;
      const result = await adapter.publish(payload, targetPlatform);

      if (result.success) {
        // 5a. Mark log as published
        await this.prisma.publishLog.update({
          where: { id: publishLogId },
          data: {
            status: PublishStatus.PUBLISHED,
            publishedLink: result.publishedLink,
            publishedAt: new Date(),
          },
        });

        // 5b. Update content status via internal REST
        await firstValueFrom(
          this.http.put(`${this.internalBase}/api/internal/content/${log.contentId}/status`, {
            status: 'PUBLISHED',
          }),
        );

        this.logger.log(`PublishLog ${publishLogId} completed: ${result.publishedLink}`);
      } else {
        throw new Error(result.errorMessage ?? 'Unknown publish error');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`PublishLog ${publishLogId} failed: ${message}`);
      await this.prisma.publishLog.update({
        where: { id: publishLogId },
        data: { status: PublishStatus.FAILED, errorMessage: message },
      });
      throw err;
    }
  }

  private getAdapter(platform: Platform) {
    switch (platform) {
      case Platform.WORDPRESS:
        return this.wordPressAdapter;
      case Platform.FACEBOOK:
        return this.facebookAdapter;
      case Platform.SHOPIFY:
        return this.shopifyAdapter;
      case Platform.BUFFER_TWITTER:
      case Platform.BUFFER_INSTAGRAM:
      case Platform.BUFFER_LINKEDIN:
      case Platform.BUFFER_TIKTOK:
      case Platform.BUFFER_PINTEREST:
      case Platform.BUFFER_FACEBOOK:
      case Platform.BUFFER_YOUTUBE:
      case Platform.BUFFER_MASTODON:
      case Platform.BUFFER_THREADS:
        return this.bufferAdapter;
      default:
        throw new Error(`No adapter available for platform: ${platform}`);
    }
  }
}
