import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import {
  IPublisherAdapter,
  ProviderCredentials,
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

// Buffer scheduling mode — kept here for internal use
type BufferMode = 'shareNow' | 'addToQueue' | 'customScheduled';

interface BufferPlatformOptions {
  mode?: BufferMode;
  dueAt?: string; // ISO 8601 UTC — required when mode is 'customScheduled'
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
export class BufferAdapter implements IPublisherAdapter {
  readonly providerKey = 'BUFFER';
  private readonly logger = new Logger(BufferAdapter.name);

  constructor(private readonly http: HttpService) {}

  isConfigured(credentials: ProviderCredentials): boolean {
    return !!(credentials.apiToken && credentials.organizationId);
  }

  async publish(payload: PublishPayload, platform: string, credentials: ProviderCredentials): Promise<PublishResult> {
    if (!this.isConfigured(credentials)) {
      return { success: false, errorMessage: 'Buffer credentials not configured (apiToken + organizationId required)' };
    }

    const service = platform.toLowerCase();
    const apiToken = credentials.apiToken!;
    const organizationId = credentials.organizationId!;

    // Load channels lazily per call
    let channelId: string | undefined;
    try {
      channelId = await this.loadChannelId(service, apiToken, organizationId);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, errorMessage: `Failed to load Buffer channels: ${msg}` };
    }

    if (!channelId) {
      return {
        success: false,
        errorMessage: `No Buffer channel found for platform: ${service}. Ensure the channel is connected in your Buffer account.`,
      };
    }

    const constraints = PLATFORM_CONSTRAINTS[service];

    // Fail loudly if image is required but missing
    if (constraints?.requiresImage && !payload.imageUrl) {
      return { success: false, errorMessage: `${service} requires an image to publish` };
    }

    const bufferOptions = (payload.platformOptions ?? {}) as BufferPlatformOptions;
    const text = this.buildText(payload, service, constraints);
    const metadata = this.buildMetadata(service);
    const { schedulingType, mode, dueAt } = this.buildScheduling(bufferOptions.mode, bufferOptions.dueAt);

    const mutation = `
      mutation CreatePost {
        createPost(input: {
          text: ${JSON.stringify(text)}
          channelId: ${JSON.stringify(channelId)}
          schedulingType: ${schedulingType}
          mode: ${mode}
          ${dueAt ? `dueAt: ${JSON.stringify(dueAt)}` : ''}
          ${metadata ? `metadata: ${metadata}` : ''}
        }) {
          ... on PostActionSuccess {
            post {
              id
            }
          }
          ... on MutationError {
            message
          }
        }
      }
    `;

    try {
      const response = await firstValueFrom(
        this.http.post<BufferGraphQLResponse<{ createPost: { post?: { id: string }; message?: string } }>>(
          BUFFER_API_URL,
          { query: mutation },
          {
            headers: {
              Authorization: `Bearer ${apiToken}`,
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

      const result = response.data.data.createPost;
      if (result.message) {
        this.logger.error(`Buffer mutation error for ${service}: ${result.message}`);
        return { success: false, errorMessage: result.message };
      }

      const postId = result.post!.id;
      const publishedLink = `https://publish.buffer.com/posts/${postId}`;
      this.logger.log(`Queued on Buffer/${service}: ${publishedLink}`);
      return { success: true, publishedLink };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Buffer publish failed for ${service}: ${message}`);
      return { success: false, errorMessage: message };
    }
  }

  private async loadChannelId(service: string, apiToken: string, organizationId: string): Promise<string | undefined> {
    const query = `
      query GetChannels {
        channels(input: { organizationId: ${JSON.stringify(organizationId)} }) {
          id
          name
          service
        }
      }
    `;

    const response = await firstValueFrom(
      this.http.post<BufferGraphQLResponse<{ channels: BufferChannel[] }>>(
        BUFFER_API_URL,
        { query },
        {
          headers: {
            Authorization: `Bearer ${apiToken}`,
            'Content-Type': 'application/json',
          },
        },
      ),
    );

    if (response.data.errors?.length) {
      throw new Error(response.data.errors.map((e) => e.message).join('; '));
    }

    const channel = response.data.data.channels.find(
      (c) => c.service.toLowerCase() === service,
    );
    return channel?.id;
  }

  private buildScheduling(
    mode: BufferMode | undefined,
    dueAt: string | undefined,
  ): { schedulingType: string; mode: string; dueAt: string | null } {
    switch (mode) {
      case 'shareNow':
        return { schedulingType: 'automatic', mode: 'shareNow', dueAt: null };
      case 'customScheduled':
        return { schedulingType: 'custom', mode: 'customScheduled', dueAt: dueAt ?? null };
      case 'addToQueue':
      default:
        return { schedulingType: 'automatic', mode: 'addToQueue', dueAt: null };
    }
  }

  private buildMetadata(service: string): string | null {
    switch (service) {
      case 'facebook':
        return '{ facebook: { type: post } }';
      default:
        return null;
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
}
