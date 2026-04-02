import { ProductDNAService } from '../application/product-dna.service';
import { ProductPrismaService } from '../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import type { AIAdapter, ProductDNA } from '@shared/ai/ai-adapter.interface';

const DNA_FIXTURE: ProductDNA = {
  coreProblem: 'Struggling to lose weight without starving',
  keyFeatures: [
    { feature: 'Natural formula', emotionalBenefit: 'Feel safe and confident' },
    { feature: 'Fast results', emotionalBenefit: 'Stay motivated' },
  ],
  targetPersona: {
    demographics: 'Adults 25-45, middle income, health-conscious',
    psychographics: 'Values wellness, frustrated by failed diets',
  },
  objectionHandling: [
    { objection: 'Too expensive', counter: 'Costs less than a gym membership' },
  ],
  visualAnchors: ['before/after photos', 'natural ingredients', 'happy customers'],
};

const createProductFixture = (overrides: Record<string, unknown> = {}) => ({
  id: 'prod-123',
  externalId: 'ext-123',
  source: 'CLICKBANK',
  name: 'Weight Loss Supplement',
  description: 'A natural supplement to help with weight loss',
  price: 49.99,
  commission: 15,
  affiliateLink: 'https://example.com/aff',
  status: 'ENRICHED',
  productDna: null,
  dnaExtractedAt: null,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
  ...overrides,
});

describe('ProductDNAService', () => {
  let service: ProductDNAService;
  let prisma: DeepMockProxy<ProductPrismaService>;
  let ai: jest.Mocked<AIAdapter>;

  beforeEach(() => {
    prisma = mockDeep<ProductPrismaService>();
    ai = {
      extractProductDNA: jest.fn(),
      generate: jest.fn(),
      generateWithDNA: jest.fn(),
    } as jest.Mocked<AIAdapter>;

    service = new ProductDNAService(prisma, ai);
  });

  // --- Test 3: Extract DNA → status moves to ACTIVE and DNA panel populates ---

  describe('extractDNA()', () => {
    it('should set product status to ACTIVE after DNA extraction', async () => {
      // Arrange
      const product = createProductFixture();
      prisma.product.findUnique.mockResolvedValue(product as any);
      ai.extractProductDNA.mockResolvedValue(DNA_FIXTURE);
      prisma.product.update.mockResolvedValue({
        ...product,
        productDna: DNA_FIXTURE,
        dnaExtractedAt: new Date(),
        status: 'ACTIVE',
      } as any);

      // Act
      await service.extractDNA('prod-123');

      // Assert
      expect(prisma.product.update).toHaveBeenCalledWith({
        where: { id: 'prod-123' },
        data: expect.objectContaining({ status: 'ACTIVE' }),
      });
    });

    it('should persist the extracted DNA on the product', async () => {
      // Arrange
      const product = createProductFixture();
      prisma.product.findUnique.mockResolvedValue(product as any);
      ai.extractProductDNA.mockResolvedValue(DNA_FIXTURE);
      prisma.product.update.mockResolvedValue(product as any);

      // Act
      await service.extractDNA('prod-123');

      // Assert
      expect(prisma.product.update).toHaveBeenCalledWith({
        where: { id: 'prod-123' },
        data: expect.objectContaining({ productDna: DNA_FIXTURE }),
      });
    });

    it('should set dnaExtractedAt timestamp', async () => {
      // Arrange
      const product = createProductFixture();
      prisma.product.findUnique.mockResolvedValue(product as any);
      ai.extractProductDNA.mockResolvedValue(DNA_FIXTURE);
      prisma.product.update.mockResolvedValue(product as any);

      // Act
      await service.extractDNA('prod-123');

      // Assert
      expect(prisma.product.update).toHaveBeenCalledWith({
        where: { id: 'prod-123' },
        data: expect.objectContaining({ dnaExtractedAt: expect.any(Date) }),
      });
    });

    it('should return the extracted DNA', async () => {
      // Arrange
      const product = createProductFixture();
      prisma.product.findUnique.mockResolvedValue(product as any);
      ai.extractProductDNA.mockResolvedValue(DNA_FIXTURE);
      prisma.product.update.mockResolvedValue(product as any);

      // Act
      const result = await service.extractDNA('prod-123');

      // Assert
      expect(result).toEqual(DNA_FIXTURE);
    });

    it('should pass correct product fields to AI adapter', async () => {
      // Arrange
      const product = createProductFixture();
      prisma.product.findUnique.mockResolvedValue(product as any);
      ai.extractProductDNA.mockResolvedValue(DNA_FIXTURE);
      prisma.product.update.mockResolvedValue(product as any);

      // Act
      await service.extractDNA('prod-123');

      // Assert
      expect(ai.extractProductDNA).toHaveBeenCalledWith({
        name: 'Weight Loss Supplement',
        description: 'A natural supplement to help with weight loss',
        price: 49.99,
        commission: 15,
        affiliateLink: 'https://example.com/aff',
      });
    });

    it('should populate all DNA fields: coreProblem, keyFeatures, targetPersona, objectionHandling, visualAnchors', async () => {
      // Arrange
      const product = createProductFixture();
      prisma.product.findUnique.mockResolvedValue(product as any);
      ai.extractProductDNA.mockResolvedValue(DNA_FIXTURE);
      prisma.product.update.mockResolvedValue(product as any);

      // Act
      const result = await service.extractDNA('prod-123');

      // Assert — DNA panel fields are populated
      expect(result.coreProblem).toBeTruthy();
      expect(result.keyFeatures).toHaveLength(2);
      expect(result.keyFeatures[0]).toHaveProperty('feature');
      expect(result.keyFeatures[0]).toHaveProperty('emotionalBenefit');
      expect(result.targetPersona).toHaveProperty('demographics');
      expect(result.targetPersona).toHaveProperty('psychographics');
      expect(result.objectionHandling).toHaveLength(1);
      expect(result.objectionHandling[0]).toHaveProperty('objection');
      expect(result.objectionHandling[0]).toHaveProperty('counter');
      expect(result.visualAnchors).toHaveLength(3);
    });

    it('should throw NotFoundException if product does not exist', async () => {
      // Arrange
      prisma.product.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.extractDNA('not-found')).rejects.toThrow(NotFoundException);
      await expect(service.extractDNA('not-found')).rejects.toThrow('not found');
    });

    it('should not update product if AI extraction fails', async () => {
      // Arrange
      const product = createProductFixture();
      prisma.product.findUnique.mockResolvedValue(product as any);
      ai.extractProductDNA.mockRejectedValue(new Error('AI service unavailable'));

      // Act & Assert
      await expect(service.extractDNA('prod-123')).rejects.toThrow('AI service unavailable');
      expect(prisma.product.update).not.toHaveBeenCalled();
    });
  });
});
