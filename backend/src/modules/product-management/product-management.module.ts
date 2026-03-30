import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ProductPrismaService } from './prisma/prisma.service';
import { ProductsController } from './presentation/products.controller';
import { ProductsInternalController } from './presentation/products.internal.controller';
import { ProductsService } from './application/products.service';
import { PrismaProductRepository } from './infrastructure/prisma-product.repository';
import { DeeplinkGenerator } from './infrastructure/deeplink-generator';

@Module({
  imports: [HttpModule],
  controllers: [ProductsController, ProductsInternalController],
  providers: [
    ProductPrismaService,
    {
      provide: 'ProductPrismaService',
      useExisting: ProductPrismaService,
    },
    ProductsService,
    PrismaProductRepository,
    DeeplinkGenerator,
  ],
  exports: [ProductPrismaService, ProductsService, 'ProductPrismaService'],
})
export class ProductManagementModule {}
