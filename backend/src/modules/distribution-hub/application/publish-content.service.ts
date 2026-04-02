import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { PublishPrismaService } from '../prisma/prisma.service';
import { AdapterFactory } from './adapter-factory.service';
import { PublishStatus } from '@prisma-client/distribution-hub';
import { PublishPayload, ProviderCredentials } from '../domain/adapters/publisher.adapter.interface';

interface ContentData {
  id: string;
  title?: string;
  body: string;
  imageUrl?: string;
  platform: string;
  status: string;
}

interface ProviderData {
  id: string;
  key: string;
  credentials: ProviderCredentials;
}

@Injectable()
export class PublishContentService {
  private readonly logger = new Logger(PublishContentService.name);
  private readonly internalBase: string;

  constructor(
    private readonly prisma: PublishPrismaService,
    private readonly adapterFactory: AdapterFactory,
    private readonly http: HttpService,
    config: ConfigService,
  ) {
    this.internalBase = config.get<string>('BACKEND_INTERNAL_URL', 'http://localhost:3000');
  }

  async publish(publishLogId: string): Promise<void> {
    // 1. Load publish log
    const log = await this.prisma.publishLog.findUnique({ where: { id: publishLogId } });
    if (!log) throw new Error(`PublishLog ${publishLogId} not found`);

    if (!log.provider || !log.providerId) {
      throw new Error(`PublishLog ${publishLogId} has no provider configured`);
    }

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

      // 4. Load provider credentials from config_db via internal REST
      const providerRes = await firstValueFrom(
        this.http.get<ProviderData>(`${this.internalBase}/api/internal/providers/${log.providerId}`),
      );
      const credentials = providerRes.data.credentials;

      const payload: PublishPayload = {
        title: content.title,
        body: content.body,
        imageUrl: content.imageUrl,
        assets: log.assets ? (log.assets as { url: string; type: 'image' | 'video' }[]) : undefined,
      };

      // 5. Route to adapter by provider key
      const adapter = this.adapterFactory.resolve(log.provider);
      const result = await adapter.publish(payload, String(log.platform), credentials);

      if (result.success) {
        // 6a. Mark log as published — this is the source of truth
        await this.prisma.publishLog.update({
          where: { id: publishLogId },
          data: {
            status: PublishStatus.PUBLISHED,
            publishedLink: result.publishedLink,
            publishedAt: new Date(),
          },
        });

        // 6b. Sync content status — non-critical, publish already succeeded
        try {
          await firstValueFrom(
            this.http.put(`${this.internalBase}/api/internal/content/${log.contentId}/status`, {
              status: 'PUBLISHED',
            }),
          );
        } catch (syncErr: unknown) {
          const syncMsg = syncErr instanceof Error ? syncErr.message : String(syncErr);
          this.logger.warn(
            `PublishLog ${publishLogId}: content status sync failed (non-critical): ${syncMsg}`,
          );
        }

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
}
