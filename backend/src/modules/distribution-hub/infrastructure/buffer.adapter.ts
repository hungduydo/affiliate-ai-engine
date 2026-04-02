import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import {
  IPublisherAdapter,
  PublishPayload,
  PublishResult,
} from '../domain/adapters/publisher.adapter.interface';

interface BufferChannel {
  id: string;
  name: string;
  service: string;
}

interface BufferGraphQLResponse<T> {
  data: T;
  errors?: { message: string }[];
}

const BUFFER_API_URL = 'https://api.buffer.com';

const PLATFORM_CONSTRAINTS: Record<
  string,
  { maxLength: number | null; requiresImage: boolean; prependTitle: boolean }
> = {
  twitter: { maxLength: 280, requiresImage: false, prependTitle: false },
  instagram: { maxLength: 2200, requiresImage: true, prependTitle: false },
  linkedin: { maxLength: 3000, requiresImage: false, prependTitle: true },
  tiktok: { maxLength: 150, requiresImage: false, prependTitle: false },
  pinterest: { maxLength: 500, requiresImage: true, prependTitle: false },
  facebook: { maxLength: null, requiresImage: false, prependTitle: false },
  youtube: { maxLength: 5000, requiresImage: false, prependTitle: true },
  mastodon: { maxLength: 500, requiresImage: false, prependTitle: false },
  threads: { maxLength: 500, requiresImage: false, prependTitle: false },
};

@Injectable()
export class BufferAdapter implements IPublisherAdapter, OnModuleInit {
  readonly platform = 'BUFFER';
  private readonly logger = new Logger(BufferAdapter.name);
  private readonly channels = new Map<string, string>(); // service → channelId

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {}

  async onModuleInit(): Promise<void> {
    if (!this.isConfigured()) return;
    try {
      await this.loadChannels();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Failed to load Buffer channels on startup: ${msg}`);
    }
  }

  isConfigured(): boolean {
    return !!(
      this.config.get('BUFFER_API_TOKEN') &&
      this.config.get('BUFFER_ORGANIZATION_ID')
    );
  }

  async publish(payload: PublishPayload, targetPlatform?: string): Promise<PublishResult> {
    if (!this.isConfigured()) {
      return { success: false, errorMessage: 'Buffer credentials not configured' };
    }

    if (!targetPlatform) {
      return { success: false, errorMessage: 'Buffer adapter requires targetPlatform' };
    }

    const service = targetPlatform.toLowerCase();
    const channelId = this.channels.get(service);

    if (!channelId) {
      // Attempt lazy reload in case channels failed at startup
      try {
        await this.loadChannels();
      } catch {
        // ignore, will fail below
      }
      const retried = this.channels.get(service);
      if (!retried) {
        return {
          success: false,
          errorMessage: `No Buffer channel found for platform: ${service}. Ensure the channel is connected in your Buffer account.`,
        };
      }
    }

    const finalChannelId = this.channels.get(service)!;
    const constraints = PLATFORM_CONSTRAINTS[service];

    // Fail loudly if image is required but missing
    if (constraints?.requiresImage && !payload.imageUrl) {
      return { success: false, errorMessage: `${service} requires an image to publish` };
    }

    const text = this.buildText(payload, service, constraints);
    const token = this.config.getOrThrow<string>('BUFFER_API_TOKEN');

    const mutation = `
      mutation CreatePost($text: String!, $channelId: String!) {
        createPost(input: {
          text: $text
          channelId: $channelId
          schedulingType: automatic
          mode: addToQueue
        }) {
          post {
            id
          }
        }
      }
    `;

    try {
      const response = await firstValueFrom(
        this.http.post<BufferGraphQLResponse<{ createPost: { post: { id: string } } }>>(
          BUFFER_API_URL,
          { query: mutation, variables: { text, channelId: finalChannelId } },
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          },
        ),
      );

      if (response.data.errors?.length) {
        const msg = response.data.errors.map((e) => e.message).join('; ');
        this.logger.error(`Buffer API error for ${service}: ${msg}`);
        return { success: false, errorMessage: msg };
      }

      const postId = response.data.data.createPost.post.id;
      const publishedLink = `https://publish.buffer.com/posts/${postId}`;
      this.logger.log(`Queued on Buffer/${service}: ${publishedLink}`);
      return { success: true, publishedLink };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Buffer publish failed for ${service}: ${message}`);
      return { success: false, errorMessage: message };
    }
  }

  private buildText(
    payload: PublishPayload,
    service: string,
    constraints: (typeof PLATFORM_CONSTRAINTS)[string] | undefined,
  ): string {
    let text = payload.body;

    if (constraints?.prependTitle && payload.title) {
      text = `${payload.title}\n\n${text}`;
    }

    const maxLength = constraints?.maxLength ?? null;
    if (maxLength && text.length > maxLength) {
      text = text.substring(0, maxLength - 3) + '...';
    }

    return text;
  }

  private async loadChannels(): Promise<void> {
    const token = this.config.getOrThrow<string>('BUFFER_API_TOKEN');
    const orgId = this.config.getOrThrow<string>('BUFFER_ORGANIZATION_ID');

    const query = `
      query GetChannels($organizationId: String!) {
        channels(input: { organizationId: $organizationId }) {
          id
          name
          service
        }
      }
    `;

    const response = await firstValueFrom(
      this.http.post<BufferGraphQLResponse<{ channels: BufferChannel[] }>>(
        BUFFER_API_URL,
        { query, variables: { organizationId: orgId } },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        },
      ),
    );

    if (response.data.errors?.length) {
      throw new Error(response.data.errors.map((e) => e.message).join('; '));
    }

    this.channels.clear();
    for (const channel of response.data.data.channels) {
      this.channels.set(channel.service.toLowerCase(), channel.id);
    }

    this.logger.log(
      `Buffer channels loaded: ${[...this.channels.keys()].join(', ')}`,
    );
  }
}
