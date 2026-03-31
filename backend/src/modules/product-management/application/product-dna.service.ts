import { Injectable, Inject, Logger, NotFoundException } from '@nestjs/common';
import { ProductPrismaService } from '../prisma/prisma.service';
import { AI_ADAPTER, AIAdapter, ProductDNA } from '@shared/ai/ai-adapter.interface';

@Injectable()
export class ProductDNAService {
  private readonly logger = new Logger(ProductDNAService.name);

  constructor(
    private readonly prisma: ProductPrismaService,
    @Inject(AI_ADAPTER) private readonly ai: AIAdapter,
  ) {}

  async extractDNA(productId: string): Promise<ProductDNA> {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new NotFoundException(`Product ${productId} not found`);

    this.logger.log(`Extracting DNA for product ${productId}`);
    const dna = await this.ai.extractProductDNA({
      name: product.name,
      description: product.description ?? undefined,
      price: product.price ?? undefined,
      commission: product.commission ?? undefined,
      affiliateLink: product.affiliateLink,
    });

    await this.prisma.product.update({
      where: { id: productId },
      data: {
        productDna: dna as object,
        dnaExtractedAt: new Date(),
        status: 'ACTIVE',
      },
    });

    this.logger.log(`DNA extracted and status set to ACTIVE for product ${productId}`);
    return dna;
  }
}
