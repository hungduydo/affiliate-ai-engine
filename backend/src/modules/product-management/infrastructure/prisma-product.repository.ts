import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ProductPrismaService } from '../prisma/prisma.service';
import { IProductRepository, ProductFilter } from '../domain/repositories/product.repository.interface';
import { ProductEntity } from '../domain/entities/product.entity';
import { PaginatedResult } from '@shared/types/common.types';

@Injectable()
export class PrismaProductRepository implements IProductRepository {
  constructor(private readonly prisma: ProductPrismaService) {}

  async findById(id: string): Promise<ProductEntity | null> {
    const row = await this.prisma.product.findUnique({ where: { id } });
    return row as unknown as ProductEntity | null;
  }

  async findByExternalId(externalId: string): Promise<ProductEntity | null> {
    const row = await this.prisma.product.findUnique({ where: { externalId } });
    return row as unknown as ProductEntity | null;
  }

  async findMany(filter: ProductFilter): Promise<PaginatedResult<ProductEntity>> {
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.ProductWhereInput = {
      ...(filter.source && { source: filter.source }),
      ...(filter.status && { status: filter.status }),
      ...(filter.search && {
        OR: [
          { name: { contains: filter.search, mode: 'insensitive' } },
          { description: { contains: filter.search, mode: 'insensitive' } },
        ],
      }),
    };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
      this.prisma.product.count({ where }),
    ]);

    return {
      data: rows as unknown as ProductEntity[],
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async create(data: Omit<ProductEntity, 'id' | 'createdAt' | 'updatedAt'>): Promise<ProductEntity> {
    const row = await this.prisma.product.create({
      data: {
        externalId: data.externalId,
        source: data.source,
        name: data.name,
        description: data.description,
        price: data.price,
        commission: data.commission,
        affiliateLink: data.affiliateLink,
        imageUrl: data.imageUrl,
        rawData: (data.rawData ?? {}) as Prisma.InputJsonValue,
        status: data.status,
        metadata: (data.metadata ?? Prisma.JsonNull) as Prisma.InputJsonValue,
      },
    });
    return row as unknown as ProductEntity;
  }

  async update(id: string, data: Partial<ProductEntity>): Promise<ProductEntity> {
    const row = await this.prisma.product.update({
      where: { id },
      data: data as Prisma.ProductUpdateInput,
    });
    return row as unknown as ProductEntity;
  }

  async delete(id: string): Promise<void> {
    await this.prisma.product.delete({ where: { id } });
  }
}
