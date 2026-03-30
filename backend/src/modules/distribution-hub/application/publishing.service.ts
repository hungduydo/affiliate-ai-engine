import { Injectable, NotFoundException } from '@nestjs/common';
import { PublishPrismaService } from '../prisma/prisma.service';
import { Platform, PublishStatus } from '@prisma/client';
import { PaginationQuery } from '@shared/types/common.types';

@Injectable()
export class PublishingService {
  constructor(private readonly prisma: PublishPrismaService) {}

  async findLogs(params: PaginationQuery & { contentId?: string; platform?: Platform; status?: PublishStatus }) {
    const page = params.page ?? 1;
    const limit = params.limit ?? 20;
    const skip = (page - 1) * limit;

    const where = {
      ...(params.contentId && { contentId: params.contentId }),
      ...(params.platform && { platform: params.platform }),
      ...(params.status && { status: params.status }),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.publishLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.publishLog.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findLogById(id: string) {
    const log = await this.prisma.publishLog.findUnique({
      where: { id },
    });
    if (!log) throw new NotFoundException(`Publish log ${id} not found`);
    return log;
  }

  async getPublishLogs(filters: {
    contentId?: string;
    status?: string;
    platform?: string;
    page?: number;
    pageSize?: number;
  }) {
    return this.findLogs({
      contentId: filters.contentId,
      status: filters.status as PublishStatus,
      platform: filters.platform as Platform,
      page: filters.page || 1,
      limit: filters.pageSize || 10,
    });
  }

  async getPublishLogById(id: string) {
    return this.findLogById(id);
  }

  async createLog(data: { contentId: string; platform: Platform }): Promise<{ id: string }> {
    return this.prisma.publishLog.create({
      data: { contentId: data.contentId, platform: data.platform, status: PublishStatus.PENDING },
    });
  }
}
