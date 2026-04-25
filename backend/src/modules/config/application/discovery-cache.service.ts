import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma-client/config';
import { ConfigPrismaService } from '../prisma/prisma.service';

export interface DiscoverProduct {
  externalId: string;
  name: string;
  description: string;
  commission: number;
  epc: number;
  price: number;
  affiliateLink: string;
  imageUrl?: string;
  advertiserName: string;
  category: string;
  score: number;
  imported: boolean;
}

export interface DiscoveryCacheData {
  data: DiscoverProduct[] | null;
  updatedAt: string | null;
  partial?: boolean;
  failedAdvertisers?: { name: string; error: string }[];
}

const CACHE_KEY = 'discovery_all';

@Injectable()
export class DiscoveryCacheService {
  constructor(private readonly prisma: ConfigPrismaService) {}

  async get(): Promise<DiscoveryCacheData> {
    const row = await this.prisma.discoveryCache.findUnique({ where: { key: CACHE_KEY } });
    if (!row) return { data: null, updatedAt: null };
    const meta = (row.meta ?? {}) as { partial?: boolean; failedAdvertisers?: { name: string; error: string }[] };
    return {
      data: row.data as unknown as DiscoverProduct[],
      updatedAt: row.updatedAt.toISOString(),
      ...(meta.partial !== undefined && { partial: meta.partial }),
      ...(meta.failedAdvertisers && { failedAdvertisers: meta.failedAdvertisers }),
    };
  }

  async set(payload: {
    data: DiscoverProduct[];
    updatedAt: string;
    partial?: boolean;
    failedAdvertisers?: { name: string; error: string }[];
  }): Promise<void> {
    const meta: Record<string, unknown> = {};
    if (payload.partial !== undefined) meta.partial = payload.partial;
    if (payload.failedAdvertisers?.length) meta.failedAdvertisers = payload.failedAdvertisers;

    const metaJson = Object.keys(meta).length ? (meta as unknown as Prisma.InputJsonObject) : undefined;
    await this.prisma.discoveryCache.upsert({
      where: { key: CACHE_KEY },
      update: { data: payload.data as unknown as Prisma.InputJsonArray, meta: metaJson },
      create: { key: CACHE_KEY, data: payload.data as unknown as Prisma.InputJsonArray, meta: metaJson },
    });
  }
}
