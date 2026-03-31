import { Controller, Get, Post, Patch, Param, Query, Body } from '@nestjs/common';
import { ProductsService } from '../application/products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { EnrichProductDto } from './dto/enrich-product.dto';

/**
 * Internal API for other modules to fetch product data
 * No authentication required for internal service-to-service calls
 */
@Controller('internal/products')
export class ProductsInternalController {
  constructor(private productsService: ProductsService) {}

  @Get()
  async getAllProducts(
    @Query('source') source?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return await this.productsService.getProducts({
      source,
      status,
      page: parseInt(page || '1'),
      pageSize: parseInt(pageSize || '10'),
    });
  }

  @Get(':id')
  async getProductById(@Param('id') id: string) {
    return await this.productsService.getProductById(id);
  }

  @Post()
  async createOrUpdate(@Body() dto: CreateProductDto) {
    return await this.productsService.createOrUpdate(dto);
  }

  @Patch(':id/enrich')
  async enrichProduct(@Param('id') id: string, @Body() dto: EnrichProductDto) {
    return await this.productsService.applyEnrichment(id, dto);
  }
}
