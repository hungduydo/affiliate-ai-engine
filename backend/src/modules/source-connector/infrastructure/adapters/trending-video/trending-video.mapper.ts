import { ScrapedProduct } from '../../../domain/adapters/source.adapter.interface';

export interface VideoMetadata {
  platform: 'bilibili' | 'xhs' | 'douyin' | 'weibo';
  video_id: string;
  title: string;
  description: string;
  channel: {
    channel_id: string;
    username: string;
    [key: string]: unknown;
  };
  duration_seconds: number;
  view_count: number;
  like_count: number;
  comment_count: number;
  share_count: number;
  collect_count: number;
  published_at: string;
  tags: string[];
  thumbnail_url?: string;
  engagement_rate: number;
  engagement_method: string;
}

export interface FilterResult {
  video: VideoMetadata;
  passed_metrics: boolean;
  passed_safety: boolean;
  rejection_reasons: string[];
  youtube_conflict: boolean;
  youtube_conflict_url?: string;
  brand_flagged: boolean;
  is_approved: boolean;
}

const PLATFORM_URLS: Record<VideoMetadata['platform'], string> = {
  bilibili: 'https://www.bilibili.com/video',
  xhs: 'https://www.xiaohongshu.com/explore',
  douyin: 'https://www.douyin.com/video',
  weibo: 'https://weibo.com',
};

export function mapVideoToProduct(v: VideoMetadata): ScrapedProduct {
  const videoUrl = `${PLATFORM_URLS[v.platform]}/${v.video_id}`;
  return {
    externalId: `${v.platform}-${v.video_id}`,
    source: 'trending-video',
    name: v.title,
    description: v.description,
    imageUrl: v.thumbnail_url ?? undefined,
    affiliateLink: videoUrl,
    productLink: videoUrl,
    rawData: v as unknown as Record<string, unknown>,
  };
}
