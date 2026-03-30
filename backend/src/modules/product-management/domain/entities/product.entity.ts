import { ProductStatus } from '@prisma/client';

export class ProductEntity {
  declare id: string;
  declare externalId: string;
  declare source: string;
  declare name: string;
  declare description: string | null;
  declare price: number | null;
  declare commission: number | null;
  declare affiliateLink: string;
  declare imageUrl: string | null;
  declare rawData: Record<string, unknown>;
  declare status: ProductStatus;
  declare metadata: Record<string, unknown> | null;
  declare createdAt: Date;
  declare updatedAt: Date;
}
