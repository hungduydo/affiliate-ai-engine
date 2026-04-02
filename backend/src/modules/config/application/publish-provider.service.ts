import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigPrismaService } from '../prisma/prisma.service';

export interface CreateProviderDto {
  key: string;
  label: string;
  enabledPlatforms: string[];
  credentials: Record<string, string>;
  isActive?: boolean;
}

export interface UpdateProviderDto {
  label?: string;
  enabledPlatforms?: string[];
  credentials?: Record<string, string>;
  isActive?: boolean;
}

@Injectable()
export class PublishProviderService {
  constructor(private readonly prisma: ConfigPrismaService) {}

  async findAll(filters?: { platform?: string; isActive?: boolean }) {
    const providers = await this.prisma.publishProvider.findMany({
      where: {
        ...(filters?.isActive !== undefined && { isActive: filters.isActive }),
      },
      orderBy: { createdAt: 'desc' },
    });

    if (filters?.platform) {
      const platform = filters.platform.toUpperCase();
      return providers.filter((p) => {
        const platforms = p.enabledPlatforms as string[];
        return platforms.includes(platform);
      });
    }

    return providers;
  }

  async findById(id: string) {
    const provider = await this.prisma.publishProvider.findUnique({ where: { id } });
    if (!provider) throw new NotFoundException(`Provider ${id} not found`);
    return provider;
  }

  async create(data: CreateProviderDto) {
    return this.prisma.publishProvider.create({
      data: {
        key: data.key,
        label: data.label,
        enabledPlatforms: data.enabledPlatforms,
        credentials: data.credentials,
        isActive: data.isActive ?? true,
      },
    });
  }

  async update(id: string, data: UpdateProviderDto) {
    await this.findById(id); // throws if not found
    return this.prisma.publishProvider.update({
      where: { id },
      data: {
        ...(data.label !== undefined && { label: data.label }),
        ...(data.enabledPlatforms !== undefined && { enabledPlatforms: data.enabledPlatforms }),
        ...(data.credentials !== undefined && { credentials: data.credentials }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    });
  }

  async delete(id: string) {
    await this.findById(id); // throws if not found
    return this.prisma.publishProvider.delete({ where: { id } });
  }
}
