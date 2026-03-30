import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaProductRepository } from '../infrastructure/prisma-product.repository';
import { DeeplinkGenerator } from '../infrastructure/deeplink-generator';
import { CreateProductDto } from '../presentation/dto/create-product.dto';
import { ProductFilter } from '../domain/repositories/product.repository.interface';
import { ProductStatus } from '@prisma/client';
import { canTransitionStatus } from '../domain/value-objects/product-status.vo';

@Injectable()
export class ProductsService {
  constructor(
    private readonly productRepo: PrismaProductRepository,
    private readonly deeplinkGen: DeeplinkGenerator,
  ) {}

  findMany(filter: ProductFilter) {
    return this.productRepo.findMany(filter);
  }

  async findById(id: string) {
    const product = await this.productRepo.findById(id);
    if (!product) throw new NotFoundException(`Product ${id} not found`);
    return product;
  }

  async create(dto: CreateProductDto) {
    const existing = await this.productRepo.findByExternalId(dto.externalId);
    if (existing) {
      throw new BadRequestException(`Product with externalId ${dto.externalId} already exists`);
    }
    // Use provided affiliateLink if available, otherwise generate one
    const affiliateLink = dto.affiliateLink || this.deeplinkGen.generate(dto.source, dto.externalId);
    return this.productRepo.create({
      ...dto,
      affiliateLink,
      rawData: dto.rawData ?? {},
      status: ProductStatus.ACTIVE,
      description: dto.description ?? null,
      price: dto.price ?? null,
      commission: dto.commission ?? null,
      imageUrl: dto.imageUrl ?? null,
      metadata: null,
    });
  }

  async updateStatus(id: string, status: ProductStatus) {
    const product = await this.findById(id);
    if (!canTransitionStatus(product.status, status)) {
      throw new BadRequestException(
        `Cannot transition from ${product.status} to ${status}`,
      );
    }
    return this.productRepo.update(id, { status });
  }

  async delete(id: string) {
    await this.findById(id);
    return this.productRepo.delete(id);
  }

  async getProducts(filters: { source?: string; status?: string; page?: number; pageSize?: number }) {
    return this.findMany({
      source: filters.source,
      status: filters.status as ProductStatus,
      page: filters.page || 1,
      limit: filters.pageSize || 10,
    });
  }

  async getProductById(id: string) {
    return this.findById(id);
  }

  async createOrUpdate(dto: CreateProductDto) {
    const existing = await this.productRepo.findByExternalId(dto.externalId);
    if (existing) {
      // If a new affiliate link is provided, use it; otherwise keep existing or generate
      const affiliateLink = dto.affiliateLink || existing.affiliateLink || this.deeplinkGen.generate(dto.source, dto.externalId);
      return this.productRepo.update(existing.id, {
        name: dto.name,
        description: dto.description ?? null,
        price: dto.price ?? null,
        commission: dto.commission ?? null,
        imageUrl: dto.imageUrl ?? null,
        affiliateLink,
        rawData: dto.rawData ?? {},
      });
    }
    // Use provided affiliateLink if available, otherwise generate one
    const affiliateLink = this.deeplinkGen.generate(dto.source, dto.externalId, dto.affiliateLink);
    return this.productRepo.create({
      ...dto,
      affiliateLink,
      rawData: dto.rawData ?? {},
      status: ProductStatus.ACTIVE,
      description: dto.description ?? null,
      price: dto.price ?? null,
      commission: dto.commission ?? null,
      imageUrl: dto.imageUrl ?? null,
      metadata: null,
    });
  }
}
