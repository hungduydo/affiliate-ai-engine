import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { ContentPrismaService } from '../prisma/prisma.service';
import { CreateContentDto, UpdateContentStatusDto } from '../presentation/dto/create-content.dto';
import { ContentStatus, Platform, ContentType } from '@prisma-client/content-factory';
import { canTransitionContentStatus } from '../domain/value-objects/content-status.vo';
import { PaginationQuery } from '@shared/types/common.types';

@Injectable()
export class ContentService {
  constructor(private readonly prisma: ContentPrismaService) {}

  async findMany(params: PaginationQuery & { productId?: string; platform?: Platform; status?: ContentStatus }) {
    const page = params.page ?? 1;
    const limit = params.limit ?? 20;
    const skip = (page - 1) * limit;

    const where = {
      ...(params.productId && { productId: params.productId }),
      ...(params.platform && { platform: params.platform }),
      ...(params.status && { status: params.status }),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.content.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
      this.prisma.content.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(id: string) {
    const content = await this.prisma.content.findUnique({
      where: { id },
    });
    if (!content) throw new NotFoundException(`Content ${id} not found`);
    return content;
  }

  async create(dto: CreateContentDto & { sourceVideoUrl?: string }) {
    return this.prisma.content.create({
      data: {
        productId: dto.productId,
        platform: dto.platform,
        contentType: dto.contentType,
        title: dto.title ?? null,
        body: dto.body ?? '',
        promptId: dto.promptId ?? null,
        sourceVideoUrl: dto.sourceVideoUrl ?? null,
        status: ContentStatus.RAW,
      },
    });
  }

  async updateStatus(id: string, status: ContentStatus) {
    const content = await this.findById(id);
    if (!canTransitionContentStatus(content.status, status)) {
      throw new BadRequestException(
        `Cannot transition from ${content.status} to ${status}`,
      );
    }
    return this.prisma.content.update({ where: { id }, data: { status } });
  }

  async getContent(filters: {
    platform?: string;
    status?: string;
    productId?: string;
    page?: number;
    pageSize?: number;
  }) {
    return this.findMany({
      platform: filters.platform as Platform,
      status: filters.status as ContentStatus,
      productId: filters.productId,
      page: filters.page || 1,
      limit: filters.pageSize || 10,
    });
  }

  async update(id: string, dto: { title?: string; body?: string }) {
    await this.findById(id); // ensure exists
    return this.prisma.content.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.body !== undefined && { body: dto.body }),
      },
    });
  }

  async updateMediaAssets(id: string, mediaAssets: Record<string, unknown>) {
    await this.findById(id); // ensure exists
    return this.prisma.content.update({
      where: { id },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data: { mediaAssets: mediaAssets as any },
    });
  }

  async getContentById(id: string) {
    return this.findById(id);
  }
}
