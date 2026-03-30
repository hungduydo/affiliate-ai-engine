import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { IPublisherAdapter, PublishPayload, PublishResult } from '../domain/adapters/publisher.adapter.interface';

@Injectable()
export class WordPressAdapter implements IPublisherAdapter {
  readonly platform = 'WORDPRESS';
  private readonly logger = new Logger(WordPressAdapter.name);

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {}

  isConfigured(): boolean {
    return !!(
      this.config.get('WORDPRESS_URL') &&
      this.config.get('WORDPRESS_USERNAME') &&
      this.config.get('WORDPRESS_APP_PASSWORD')
    );
  }

  async publish(payload: PublishPayload): Promise<PublishResult> {
    if (!this.isConfigured()) {
      return { success: false, errorMessage: 'WordPress credentials not configured' };
    }

    const baseUrl = this.config.getOrThrow<string>('WORDPRESS_URL');
    const username = this.config.getOrThrow<string>('WORDPRESS_USERNAME');
    const appPassword = this.config.getOrThrow<string>('WORDPRESS_APP_PASSWORD');

    const credentials = Buffer.from(`${username}:${appPassword}`).toString('base64');

    try {
      const response = await firstValueFrom(
        this.http.post<{ id: number; link: string }>(
          `${baseUrl.replace(/\/$/, '')}/wp-json/wp/v2/posts`,
          {
            title: payload.title ?? '',
            content: payload.body,
            status: 'publish',
            ...(payload.tags && payload.tags.length > 0 ? { tags: payload.tags } : {}),
          },
          {
            headers: {
              Authorization: `Basic ${credentials}`,
              'Content-Type': 'application/json',
            },
          },
        ),
      );

      this.logger.log(`Published to WordPress: ${response.data.link}`);
      return { success: true, publishedLink: response.data.link };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`WordPress publish failed: ${message}`);
      return { success: false, errorMessage: message };
    }
  }
}
