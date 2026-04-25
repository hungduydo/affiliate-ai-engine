import { TrendingVideoAdapter } from '../infrastructure/adapters/trending-video/trending-video.adapter';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { of, throwError } from 'rxjs';
import { FilterResult, VideoMetadata } from '../infrastructure/adapters/trending-video/trending-video.mapper';

function makeVideo(overrides: Partial<VideoMetadata> = {}): VideoMetadata {
  return {
    platform: 'bilibili',
    video_id: 'BV1abc123',
    title: 'Test Video',
    description: 'Great product review',
    channel: { channel_id: 'ch-1', username: 'reviewer' },
    duration_seconds: 120,
    view_count: 50000,
    like_count: 2000,
    comment_count: 300,
    share_count: 150,
    collect_count: 500,
    published_at: '2026-04-01T00:00:00Z',
    tags: ['review', 'product'],
    thumbnail_url: 'https://i2.hdslb.com/bfs/thumb/BV1abc123.jpg',
    engagement_rate: 0.054,
    engagement_method: 'standard',
    ...overrides,
  };
}

function makeFilterResult(overrides: Partial<FilterResult> = {}): FilterResult {
  return {
    video: makeVideo(),
    passed_metrics: true,
    passed_safety: true,
    rejection_reasons: [],
    youtube_conflict: false,
    brand_flagged: false,
    is_approved: true,
    ...overrides,
  };
}

describe('TrendingVideoAdapter', () => {
  let adapter: TrendingVideoAdapter;
  let http: jest.Mocked<HttpService>;
  let config: jest.Mocked<ConfigService>;

  beforeEach(() => {
    http = {
      post: jest.fn(),
      get: jest.fn(),
    } as unknown as jest.Mocked<HttpService>;

    config = {
      get: jest.fn().mockReturnValue('http://localhost:8000'),
    } as unknown as jest.Mocked<ConfigService>;

    adapter = new TrendingVideoAdapter(http, config);

    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('source', () => {
    it('should have source = "trending-video"', () => {
      expect(adapter.source).toBe('trending-video');
    });
  });

  describe('fetchProducts()', () => {
    it('should post job to flow-search and return approved products', async () => {
      const approved = makeFilterResult();
      http.post.mockReturnValue(of({ data: { job_id: 'job-abc' } } as any));
      http.get.mockReturnValue(
        of({ data: { job_id: 'job-abc', status: 'done', results: [approved] } } as any),
      );

      const promise = adapter.fetchProducts('review product', 10);
      await jest.runAllTimersAsync();
      const products = await promise;

      expect(http.post).toHaveBeenCalledWith(
        'http://localhost:8000/jobs',
        { keywords: ['review product'] },
      );
      expect(products).toHaveLength(1);
      expect(products[0].source).toBe('trending-video');
    });

    it('should poll GET /jobs/:id until status is done', async () => {
      http.post.mockReturnValue(of({ data: { job_id: 'job-xyz' } } as any));
      http.get
        .mockReturnValueOnce(of({ data: { job_id: 'job-xyz', status: 'queued' } } as any))
        .mockReturnValueOnce(of({ data: { job_id: 'job-xyz', status: 'running' } } as any))
        .mockReturnValueOnce(
          of({ data: { job_id: 'job-xyz', status: 'done', results: [makeFilterResult()] } } as any),
        );

      const promise = adapter.fetchProducts('test', 5);
      await jest.runAllTimersAsync();
      const products = await promise;

      expect(http.get).toHaveBeenCalledTimes(3);
      expect(products).toHaveLength(1);
    });

    it('should filter out non-approved results', async () => {
      const approved = makeFilterResult({ is_approved: true });
      const rejected = makeFilterResult({
        video: makeVideo({ video_id: 'BV2xyz' }),
        is_approved: false,
        rejection_reasons: ['low engagement'],
      });

      http.post.mockReturnValue(of({ data: { job_id: 'job-1' } } as any));
      http.get.mockReturnValue(
        of({ data: { status: 'done', results: [approved, rejected] } } as any),
      );

      const promise = adapter.fetchProducts('test', 10);
      await jest.runAllTimersAsync();
      const products = await promise;

      expect(products).toHaveLength(1);
      expect(products[0].externalId).toBe('bilibili-BV1abc123');
    });

    it('should respect the limit parameter', async () => {
      const results = Array.from({ length: 10 }, (_, i) =>
        makeFilterResult({ video: makeVideo({ video_id: `BV${i}` }) }),
      );

      http.post.mockReturnValue(of({ data: { job_id: 'job-2' } } as any));
      http.get.mockReturnValue(of({ data: { status: 'done', results } } as any));

      const promise = adapter.fetchProducts('test', 3);
      await jest.runAllTimersAsync();
      const products = await promise;

      expect(products).toHaveLength(3);
    });

    it('should throw when job fails', async () => {
      http.post.mockReturnValue(of({ data: { job_id: 'job-fail' } } as any));
      http.get.mockReturnValue(
        of({ data: { status: 'failed', error: 'platform rate limited' } } as any),
      );

      const promise = adapter.fetchProducts('test', 5);
      jest.runAllTimers();

      await expect(promise).rejects.toThrow('platform rate limited');
    });

    it('should throw when job fails with no error message', async () => {
      http.post.mockReturnValue(of({ data: { job_id: 'job-fail2' } } as any));
      http.get.mockReturnValue(of({ data: { status: 'failed' } } as any));

      const promise = adapter.fetchProducts('test', 5);
      jest.runAllTimers();

      await expect(promise).rejects.toThrow('unknown error');
    });

    it('should return empty array when done with no results', async () => {
      http.post.mockReturnValue(of({ data: { job_id: 'job-empty' } } as any));
      http.get.mockReturnValue(of({ data: { status: 'done' } } as any));

      const promise = adapter.fetchProducts('test', 5);
      jest.runAllTimers();
      const products = await promise;

      expect(products).toHaveLength(0);
    });

    it('should throw when HTTP post to /jobs fails', async () => {
      http.post.mockReturnValue(throwError(() => new Error('flow-search unreachable')));

      await expect(adapter.fetchProducts('test', 5)).rejects.toThrow('flow-search unreachable');
    });

    it('should use FLOW_SEARCH_URL from config', async () => {
      (config.get as jest.Mock).mockReturnValue('http://custom-search:9000');
      http.post.mockReturnValue(of({ data: { job_id: 'job-3' } } as any));
      http.get.mockReturnValue(of({ data: { status: 'done', results: [] } } as any));

      const promise = adapter.fetchProducts('test', 5);
      await jest.runAllTimersAsync();
      await promise;

      expect(http.post).toHaveBeenCalledWith(
        'http://custom-search:9000/jobs',
        expect.any(Object),
      );
    });
  });

  describe('mapVideoToProduct()', () => {
    it('should map bilibili video to correct product URL', async () => {
      const video = makeVideo({ platform: 'bilibili', video_id: 'BV1test' });
      http.post.mockReturnValue(of({ data: { job_id: 'job-map' } } as any));
      http.get.mockReturnValue(
        of({ data: { status: 'done', results: [makeFilterResult({ video })] } } as any),
      );

      const promise = adapter.fetchProducts('test', 1);
      await jest.runAllTimersAsync();
      const [product] = await promise;

      expect(product.productLink).toBe('https://www.bilibili.com/video/BV1test');
      expect(product.affiliateLink).toBe('https://www.bilibili.com/video/BV1test');
      expect(product.externalId).toBe('bilibili-BV1test');
    });

    it('should map xhs video to correct product URL', async () => {
      const video = makeVideo({ platform: 'xhs', video_id: 'xhs-post-1' });
      http.post.mockReturnValue(of({ data: { job_id: 'job-xhs' } } as any));
      http.get.mockReturnValue(
        of({ data: { status: 'done', results: [makeFilterResult({ video })] } } as any),
      );

      const promise = adapter.fetchProducts('test', 1);
      await jest.runAllTimersAsync();
      const [product] = await promise;

      expect(product.productLink).toContain('xiaohongshu.com');
    });

    it('should use video title as product name', async () => {
      const video = makeVideo({ title: 'Amazing Product Review 2026' });
      http.post.mockReturnValue(of({ data: { job_id: 'job-title' } } as any));
      http.get.mockReturnValue(
        of({ data: { status: 'done', results: [makeFilterResult({ video })] } } as any),
      );

      const promise = adapter.fetchProducts('test', 1);
      await jest.runAllTimersAsync();
      const [product] = await promise;

      expect(product.name).toBe('Amazing Product Review 2026');
    });

    it('should use thumbnail_url as imageUrl when present', async () => {
      const video = makeVideo({ thumbnail_url: 'https://cdn.example.com/thumb.jpg' });
      http.post.mockReturnValue(of({ data: { job_id: 'job-thumb' } } as any));
      http.get.mockReturnValue(
        of({ data: { status: 'done', results: [makeFilterResult({ video })] } } as any),
      );

      const promise = adapter.fetchProducts('test', 1);
      await jest.runAllTimersAsync();
      const [product] = await promise;

      expect(product.imageUrl).toBe('https://cdn.example.com/thumb.jpg');
    });

    it('should set imageUrl to undefined when thumbnail_url is missing', async () => {
      const video = makeVideo({ thumbnail_url: undefined });
      http.post.mockReturnValue(of({ data: { job_id: 'job-nothumb' } } as any));
      http.get.mockReturnValue(
        of({ data: { status: 'done', results: [makeFilterResult({ video })] } } as any),
      );

      const promise = adapter.fetchProducts('test', 1);
      await jest.runAllTimersAsync();
      const [product] = await promise;

      expect(product.imageUrl).toBeUndefined();
    });
  });
});
