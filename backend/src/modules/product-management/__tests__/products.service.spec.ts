import { ProductsService } from '../application/products.service';
import { PrismaProductRepository } from '../infrastructure/prisma-product.repository';
import { DeeplinkGenerator } from '../infrastructure/deeplink-generator';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ProductStatus, EnrichStatus } from '@prisma-client/product-management';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';

const createProductFixture = (overrides: Record<string, unknown> = {}) => ({
  id: 'prod-123',
  externalId: 'ext-123',
  source: 'CLICKBANK',
  name: 'Test Product',
  description: 'A great product',
  price: 29.99,
  commission: 10,
  affiliateLink: 'https://example.com/aff',
  productLink: 'https://example.com/product',
  imageUrl: null,
  rawData: {},
  status: ProductStatus.RAW,
  enrichStatus: EnrichStatus.PENDING,
  enrichedAt: null,
  metadata: null,
  productDna: null,
  dnaExtractedAt: null,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
  ...overrides,
});

describe('ProductsService', () => {
  let service: ProductsService;
  let repo: DeepMockProxy<PrismaProductRepository>;
  let deeplinkGen: jest.Mocked<DeeplinkGenerator>;

  beforeEach(() => {
    repo = mockDeep<PrismaProductRepository>();
    deeplinkGen = {
      generate: jest.fn().mockReturnValue('https://example.com/aff/generated'),
    } as unknown as jest.Mocked<DeeplinkGenerator>;

    service = new ProductsService(repo, deeplinkGen);
  });

  // --- Test 1: Import a product → verify status is RAW ---

  describe('create()', () => {
    const dto = {
      externalId: 'ext-123',
      source: 'CLICKBANK',
      name: 'New Product',
      affiliateLink: 'https://example.com/aff',
    };

    it('should create a product with status RAW', async () => {
      // Arrange
      repo.findByExternalId.mockResolvedValue(null);
      repo.create.mockResolvedValue(createProductFixture({ status: ProductStatus.RAW }) as any);

      // Act
      const result = await service.create(dto as any);

      // Assert
      expect(result.status).toBe(ProductStatus.RAW);
      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ status: ProductStatus.RAW }),
      );
    });

    it('should set enrichStatus to PENDING on create', async () => {
      // Arrange
      repo.findByExternalId.mockResolvedValue(null);
      repo.create.mockResolvedValue(createProductFixture() as any);

      // Act
      await service.create(dto as any);

      // Assert
      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ enrichStatus: EnrichStatus.PENDING }),
      );
    });

    it('should set productDna to null on create', async () => {
      // Arrange
      repo.findByExternalId.mockResolvedValue(null);
      repo.create.mockResolvedValue(createProductFixture() as any);

      // Act
      await service.create(dto as any);

      // Assert
      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ productDna: null, dnaExtractedAt: null }),
      );
    });

    it('should throw if product with same externalId already exists', async () => {
      // Arrange
      repo.findByExternalId.mockResolvedValue(createProductFixture() as any);

      // Act & Assert
      await expect(service.create(dto as any)).rejects.toThrow(BadRequestException);
      await expect(service.create(dto as any)).rejects.toThrow('already exists');
    });

    it('should use provided affiliateLink if given', async () => {
      // Arrange
      repo.findByExternalId.mockResolvedValue(null);
      repo.create.mockResolvedValue(createProductFixture() as any);
      const dtoWithLink = { ...dto, affiliateLink: 'https://custom-link.com' };

      // Act
      await service.create(dtoWithLink as any);

      // Assert
      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ affiliateLink: 'https://custom-link.com' }),
      );
      expect(deeplinkGen.generate).not.toHaveBeenCalled();
    });
  });

  // --- Test 2: Fetch product detail → verify enrichStatus moves to DONE ---

  describe('applyEnrichment()', () => {
    it('should set enrichedAt when enrichment is applied', async () => {
      // Arrange
      const product = createProductFixture({ status: ProductStatus.RAW, enrichStatus: EnrichStatus.PENDING });
      repo.findById.mockResolvedValue(product as any);
      repo.update.mockResolvedValue({
        ...product,
        enrichStatus: EnrichStatus.DONE,
        enrichedAt: new Date(),
      } as any);

      // Act
      await service.applyEnrichment('prod-123', {
        description: 'Updated description',
        enrichStatus: EnrichStatus.DONE,
      } as any);

      // Assert
      expect(repo.update).toHaveBeenCalledWith(
        'prod-123',
        expect.objectContaining({ enrichedAt: expect.any(Date) }),
      );
    });

    it('should set enrichStatus to DONE when enrichment is applied', async () => {
      // Arrange
      const product = createProductFixture();
      repo.findById.mockResolvedValue(product as any);
      repo.update.mockResolvedValue({ ...product, enrichStatus: EnrichStatus.DONE } as any);

      // Act
      await service.applyEnrichment('prod-123', { enrichStatus: EnrichStatus.DONE } as any);

      // Assert
      expect(repo.update).toHaveBeenCalledWith(
        'prod-123',
        expect.objectContaining({ enrichStatus: EnrichStatus.DONE }),
      );
    });

    it('should populate metadata with images from enrichment', async () => {
      // Arrange
      const product = createProductFixture({ metadata: null });
      repo.findById.mockResolvedValue(product as any);
      repo.update.mockResolvedValue(product as any);
      const images = [{ url: 'https://img.com/1.jpg', isPrimary: true }];

      // Act
      await service.applyEnrichment('prod-123', { images, enrichStatus: EnrichStatus.DONE } as any);

      // Assert
      expect(repo.update).toHaveBeenCalledWith(
        'prod-123',
        expect.objectContaining({ metadata: expect.objectContaining({ gallery: images }) }),
      );
    });

    it('should populate metadata with rating from enrichment', async () => {
      // Arrange
      const product = createProductFixture({ metadata: null });
      repo.findById.mockResolvedValue(product as any);
      repo.update.mockResolvedValue(product as any);

      // Act
      await service.applyEnrichment('prod-123', { rating: 4.5, reviewCount: 120 } as any);

      // Assert
      expect(repo.update).toHaveBeenCalledWith(
        'prod-123',
        expect.objectContaining({
          metadata: expect.objectContaining({ rating: 4.5, reviewCount: 120 }),
        }),
      );
    });

    it('should not overwrite existing description', async () => {
      // Arrange
      const product = createProductFixture({ description: 'Existing desc' });
      repo.findById.mockResolvedValue(product as any);
      repo.update.mockResolvedValue(product as any);

      // Act
      await service.applyEnrichment('prod-123', { description: 'New desc' } as any);

      // Assert: description not overwritten
      const call = (repo.update as jest.Mock).mock.calls[0][1];
      expect(call).not.toHaveProperty('description');
    });

    it('should throw NotFoundException if product not found', async () => {
      // Arrange
      repo.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.applyEnrichment('not-found', {} as any),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // --- Test 5: Filter by "Active" → only DNA-ready products ---

  describe('findMany() with status filter', () => {
    it('should pass status=ACTIVE filter to repository', async () => {
      // Arrange
      repo.findMany.mockResolvedValue({ data: [], total: 0, page: 1, limit: 20, totalPages: 0 });

      // Act
      await service.findMany({ status: ProductStatus.ACTIVE, page: 1, limit: 20 });

      // Assert
      expect(repo.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ status: ProductStatus.ACTIVE }),
      );
    });

    it('should return only ACTIVE products when filtered', async () => {
      // Arrange
      const activeProduct = createProductFixture({
        status: ProductStatus.ACTIVE,
        productDna: { coreProblem: 'test' },
        dnaExtractedAt: new Date(),
      });
      repo.findMany.mockResolvedValue({
        data: [activeProduct] as any,
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      });

      // Act
      const result = await service.findMany({ status: ProductStatus.ACTIVE, page: 1, limit: 20 });

      // Assert
      expect(result.data).toHaveLength(1);
      expect(result.data[0].status).toBe(ProductStatus.ACTIVE);
      expect(result.data[0].productDna).toBeTruthy();
    });

    it('should return all products when no status filter applied', async () => {
      // Arrange
      repo.findMany.mockResolvedValue({ data: [], total: 0, page: 1, limit: 20, totalPages: 0 });

      // Act
      await service.findMany({ page: 1, limit: 20 });

      // Assert
      expect(repo.findMany).toHaveBeenCalledWith(
        expect.not.objectContaining({ status: expect.anything() }),
      );
    });
  });
});
