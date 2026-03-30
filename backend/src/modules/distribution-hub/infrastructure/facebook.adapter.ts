import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { IPublisherAdapter, PublishPayload, PublishResult } from '../domain/adapters/publisher.adapter.interface';

@Injectable()
export class FacebookAdapter implements IPublisherAdapter {
  readonly platform = 'FACEBOOK';
  private readonly logger = new Logger(FacebookAdapter.name);

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {}

  isConfigured(): boolean {
    return !!(
      this.config.get('FACEBOOK_PAGE_ID') &&
      this.config.get('FACEBOOK_ACCESS_TOKEN')
    );
  }

  async publish(payload: PublishPayload): Promise<PublishResult> {
    if (!this.isConfigured()) {
      return { success: false, errorMessage: 'Facebook credentials not configured' };
    }

    const pageId = this.config.getOrThrow<string>('FACEBOOK_PAGE_ID');
    const accessToken = this.config.getOrThrow<string>('FACEBOOK_ACCESS_TOKEN');

    try {
      const response = await firstValueFrom(
        this.http.post<{ id: string }>(
          `https://graph.facebook.com/v19.0/${pageId}/feed`,
          {
            message: payload.body,
            ...(payload.imageUrl ? { link: payload.imageUrl } : {}),
          },
          {
            params: { access_token: accessToken },
            headers: { 'Content-Type': 'application/json' },
          },
        ),
      );

      const postId = response.data.id;
      const publishedLink = `https://www.facebook.com/${postId.replace('_', '/posts/')}`;
      this.logger.log(`Published to Facebook: ${publishedLink}`);
      return { success: true, publishedLink };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Facebook publish failed: ${message}`);
      return { success: false, errorMessage: message };
    }
  }
}
