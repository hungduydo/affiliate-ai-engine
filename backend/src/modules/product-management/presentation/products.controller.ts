import {
  Controller, Get, Post, Put, Delete, Param, Body, Query, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { ProductsService } from '../application/products.service';
import { CreateProductDto, UpdateProductStatusDto } from './dto/create-product.dto';
import { ProductStatus } from '@prisma/client';

@ApiTags('products')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @ApiOperation({ summary: 'List products with pagination and filters' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'source', required: false })
  @ApiQuery({ name: 'status', required: false, enum: ProductStatus })
  @ApiQuery({ name: 'search', required: false })
  findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('source') source?: string,
    @Query('status') status?: ProductStatus,
    @Query('search') search?: string,
  ) {
    return this.productsService.findMany({ page, limit, source, status, search });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get product by ID' })
  findOne(@Param('id') id: string) {
    return this.productsService.findById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new product' })
  create(@Body() dto: CreateProductDto) {
    return this.productsService.create(dto);
  }

  @Put(':id/status')
  @ApiOperation({ summary: 'Update product status' })
  updateStatus(@Param('id') id: string, @Body() dto: UpdateProductStatusDto) {
    return this.productsService.updateStatus(id, dto.status);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a product' })
  remove(@Param('id') id: string) {
    return this.productsService.delete(id);
  }
}
