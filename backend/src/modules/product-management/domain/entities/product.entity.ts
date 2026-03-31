import { ProductStatus, EnrichStatus } from '@prisma-client/product-management';

export class ProductEntity {
  declare id: string;
  declare externalId: string;
  declare source: string;
  declare name: string;
  declare description: string | null;
  declare price: number | null;
  declare commission: number | null;
  declare affiliateLink: string;
  declare productLink: string | null;
  declare imageUrl: string | null;
  declare rawData: Record<string, unknown>;
  declare status: ProductStatus;
  declare enrichStatus: EnrichStatus;
  declare enrichedAt: Date | null;
  declare metadata: Record<string, unknown> | null;
  declare createdAt: Date;
  declare updatedAt: Date;
}
