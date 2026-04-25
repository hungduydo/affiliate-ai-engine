/**
 * Integration-style unit tests for features added during platform consolidation:
 *   1. ContentService.updateMediaAssets() — called by flow-video worker after B2 upload
 *   2. ContentService.create() with sourceVideoUrl — persists the video source URL
 *   3. ContentGenerationService.generate() — enqueues PROCESS_VIDEO job for VIDEO_SCRIPT content
 *      that has a sourceVideoUrl set
 */

import { ContentService } from '../application/content.service';
import { ContentGenerationService } from '../application/content-generation.service';
import { ContentPrismaService } from '../prisma/prisma.service';
import { GeminiAdapter } from '../../../shared/ai/gemini.adapter';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { QueueService } from '../../queue-engine/queue.service';
import { QUEUE_NAMES, JobName } from '../../queue-engine/queue.constants';
import { ContentStatus, Platform, ContentType } from '@prisma-client/content-factory';
import { of } from 'rxjs';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import {
  createContentFixture,
  createProductFixture,
  createPromptFixture,
  createGeneratedContentFixture,
} from './fixtures/content.fixtures';

jest.mock('../../../shared/ai/gemini.adapter');

// ---------------------------------------------------------------------------
// ContentService — updateMediaAssets
// ---------------------------------------------------------------------------

describe('ContentService — updateMediaAssets()', () => {
  let service: ContentService;
  let prisma: DeepMockProxy<ContentPrismaService>;

  beforeEach(() => {
    prisma = mockDeep<ContentPrismaService>();
    service = new ContentService(prisma);
  });

  it('should update mediaAssets for an existing content record', async () => {
    const content = createContentFixture({ id: 'content-vid-1' });
    prisma.content.findUnique.mockResolvedValue(content as any);
    prisma.content.update.mockResolvedValue({
      ...content,
      mediaAssets: { videoKey: 'videos/final/content-vid-1/youtube.mp4', thumbnailKey: 'thumbnails/content-vid-1/banner.jpg' },
    } as any);

    const assets = {
      videoKey: 'videos/final/content-vid-1/youtube.mp4',
      thumbnailKey: 'thumbnails/content-vid-1/banner.jpg',
    };
    await service.updateMediaAssets('content-vid-1', assets);

    expect(prisma.content.update).toHaveBeenCalledWith({
      where: { id: 'content-vid-1' },
      data: { mediaAssets: assets },
    });
  });

  it('should throw NotFoundException when content does not exist', async () => {
    prisma.content.findUnique.mockResolvedValue(null);

    await expect(
      service.updateMediaAssets('ghost-id', { videoKey: 'key' }),
    ).rejects.toThrow('Content ghost-id not found');
    expect(prisma.content.update).not.toHaveBeenCalled();
  });

  it('should accept arbitrary nested asset shapes', async () => {
    const content = createContentFixture({ id: 'content-nested' });
    prisma.content.findUnique.mockResolvedValue(content as any);
    prisma.content.update.mockResolvedValue(content as any);

    const complexAssets = {
      videoKey: 'videos/final/content-nested/tiktok.mp4',
      thumbnailKey: 'thumbnails/content-nested/banner.jpg',
      subtitleKey: 'subtitles/content-nested/en.vtt',
      metadata: { durationMs: 45000, resolution: '1080p' },
    };
    await service.updateMediaAssets('content-nested', complexAssets);

    expect(prisma.content.update).toHaveBeenCalledWith({
      where: { id: 'content-nested' },
      data: { mediaAssets: complexAssets },
    });
  });
});

// ---------------------------------------------------------------------------
// ContentService — create() with sourceVideoUrl
// ---------------------------------------------------------------------------

describe('ContentService — create() with sourceVideoUrl', () => {
  let service: ContentService;
  let prisma: DeepMockProxy<ContentPrismaService>;

  beforeEach(() => {
    prisma = mockDeep<ContentPrismaService>();
    service = new ContentService(prisma);
  });

  it('should persist sourceVideoUrl when provided', async () => {
    const dto = {
      productId: 'prod-123',
      platform: Platform.TIKTOK,
      contentType: ContentType.VIDEO_SCRIPT,
      sourceVideoUrl: 'https://www.bilibili.com/video/BV1abc',
    };
    prisma.content.create.mockResolvedValue(createContentFixture() as any);

    await service.create(dto);

    expect(prisma.content.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        sourceVideoUrl: 'https://www.bilibili.com/video/BV1abc',
        contentType: ContentType.VIDEO_SCRIPT,
        platform: Platform.TIKTOK,
        status: ContentStatus.RAW,
      }),
    });
  });

  it('should store null when sourceVideoUrl is not provided', async () => {
    const dto = {
      productId: 'prod-123',
      platform: Platform.WORDPRESS,
      contentType: ContentType.BLOG_POST,
    };
    prisma.content.create.mockResolvedValue(createContentFixture() as any);

    await service.create(dto);

    expect(prisma.content.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ sourceVideoUrl: null }),
    });
  });
});

// ---------------------------------------------------------------------------
// ContentGenerationService — VIDEO_SCRIPT → PROCESS_VIDEO job dispatch
// ---------------------------------------------------------------------------

describe('ContentGenerationService — VIDEO_SCRIPT job dispatch', () => {
  let service: ContentGenerationService;
  let prisma: DeepMockProxy<ContentPrismaService>;
  let gemini: jest.Mocked<GeminiAdapter>;
  let http: jest.Mocked<HttpService>;
  let config: ConfigService;
  let queueService: jest.Mocked<QueueService>;

  const contentId = 'content-video-123';
  const productId = 'prod-123';
  const product = createProductFixture({ id: productId });
  const prompt = createPromptFixture();
  const generatedContent = createGeneratedContentFixture();

  beforeEach(() => {
    prisma = mockDeep<ContentPrismaService>();

    gemini = {
      generate: jest.fn().mockResolvedValue(generatedContent),
      generateWithDNA: jest.fn(),
    } as unknown as jest.Mocked<GeminiAdapter>;

    http = {
      get: jest.fn().mockImplementation((url: string) => {
        if (url.includes('products')) return of({ data: product } as any);
        return of({ data: { data: [prompt] } } as any);
      }),
    } as unknown as jest.Mocked<HttpService>;

    config = {
      get: jest.fn().mockReturnValue('http://localhost:3001'),
    } as unknown as ConfigService;

    queueService = {
      addJob: jest.fn().mockResolvedValue('mock-job-id'),
    } as unknown as jest.Mocked<QueueService>;

    service = new ContentGenerationService(prisma, gemini, http, queueService, config);
  });

  it('should enqueue PROCESS_VIDEO job after VIDEO_SCRIPT generation when sourceVideoUrl is set', async () => {
    const content = createContentFixture({
      id: contentId,
      productId,
      platform: Platform.TIKTOK,
      contentType: ContentType.VIDEO_SCRIPT,
      sourceVideoUrl: 'https://www.bilibili.com/video/BV1ref',
    });
    prisma.content.findUnique.mockResolvedValue(content as any);
    prisma.content.update.mockResolvedValue({ ...content, status: ContentStatus.GENERATED } as any);

    await service.generate(contentId);

    expect(queueService.addJob).toHaveBeenCalledWith(
      QUEUE_NAMES.VIDEO_PROCESSING,
      JobName.PROCESS_VIDEO,
      expect.objectContaining({
        contentId,
        bilibiliUrl: 'https://www.bilibili.com/video/BV1ref',
      }),
    );
  });

  it('should NOT enqueue PROCESS_VIDEO for VIDEO_SCRIPT without sourceVideoUrl', async () => {
    const content = createContentFixture({
      id: contentId,
      productId,
      contentType: ContentType.VIDEO_SCRIPT,
      sourceVideoUrl: null,
    });
    prisma.content.findUnique.mockResolvedValue(content as any);
    prisma.content.update.mockResolvedValue({ ...content, status: ContentStatus.GENERATED } as any);

    await service.generate(contentId);

    expect(queueService.addJob).not.toHaveBeenCalledWith(
      QUEUE_NAMES.VIDEO_PROCESSING,
      JobName.PROCESS_VIDEO,
      expect.anything(),
    );
  });

  it('should NOT enqueue PROCESS_VIDEO for non-VIDEO_SCRIPT content types', async () => {
    const content = createContentFixture({
      id: contentId,
      productId,
      contentType: ContentType.BLOG_POST,
      sourceVideoUrl: 'https://www.bilibili.com/video/BV1unused',
    });
    prisma.content.findUnique.mockResolvedValue(content as any);
    prisma.content.update.mockResolvedValue({ ...content, status: ContentStatus.GENERATED } as any);

    await service.generate(contentId);

    expect(queueService.addJob).not.toHaveBeenCalledWith(
      QUEUE_NAMES.VIDEO_PROCESSING,
      expect.anything(),
      expect.anything(),
    );
  });

  it('should pass targetPlatform=tiktok for TIKTOK platform', async () => {
    const content = createContentFixture({
      id: contentId,
      productId,
      platform: Platform.TIKTOK,
      contentType: ContentType.VIDEO_SCRIPT,
      sourceVideoUrl: 'https://www.bilibili.com/video/BV1tiktok',
    });
    prisma.content.findUnique.mockResolvedValue(content as any);
    prisma.content.update.mockResolvedValue({ ...content, status: ContentStatus.GENERATED } as any);

    await service.generate(contentId);

    expect(queueService.addJob).toHaveBeenCalledWith(
      QUEUE_NAMES.VIDEO_PROCESSING,
      JobName.PROCESS_VIDEO,
      expect.objectContaining({ targetPlatform: 'tiktok' }),
    );
  });

  it('should pass targetPlatform=youtube for non-TIKTOK platforms', async () => {
    const content = createContentFixture({
      id: contentId,
      productId,
      platform: Platform.YOUTUBE,
      contentType: ContentType.VIDEO_SCRIPT,
      sourceVideoUrl: 'https://www.bilibili.com/video/BV1yt',
    });
    prisma.content.findUnique.mockResolvedValue(content as any);
    prisma.content.update.mockResolvedValue({ ...content, status: ContentStatus.GENERATED } as any);

    await service.generate(contentId);

    expect(queueService.addJob).toHaveBeenCalledWith(
      QUEUE_NAMES.VIDEO_PROCESSING,
      JobName.PROCESS_VIDEO,
      expect.objectContaining({ targetPlatform: 'youtube' }),
    );
  });

  it('should still mark content as GENERATED even when video job enqueue fails', async () => {
    const content = createContentFixture({
      id: contentId,
      productId,
      platform: Platform.TIKTOK,
      contentType: ContentType.VIDEO_SCRIPT,
      sourceVideoUrl: 'https://www.bilibili.com/video/BV1fail',
    });
    prisma.content.findUnique.mockResolvedValue(content as any);
    prisma.content.update.mockResolvedValue({ ...content, status: ContentStatus.GENERATED } as any);
    queueService.addJob.mockRejectedValue(new Error('Redis connection lost'));

    await service.generate(contentId);

    const updateCalls = (prisma.content.update as jest.Mock).mock.calls;
    const finalUpdate = updateCalls[updateCalls.length - 1][0];
    expect(finalUpdate.data.status).toBe(ContentStatus.GENERATED);
  });
});
