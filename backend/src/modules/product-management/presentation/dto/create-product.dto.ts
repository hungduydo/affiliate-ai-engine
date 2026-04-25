import { IsString, IsOptional, IsNumber, IsUrl, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProductStatus } from '@prisma-client/product-management';

export class CreateProductDto {
  @ApiProperty({ example: 'CB12345' })
  @IsString()
  externalId!: string;

  @ApiProperty({ example: 'shopee', enum: ['shopee', 'trending-video'] })
  @IsString()
  source!: string;

  @ApiProperty({ example: 'Amazing Product' })
  @IsString()
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 49.99 })
  @IsOptional()
  @IsNumber()
  price?: number;

  @ApiPropertyOptional({ example: 75 })
  @IsOptional()
  @IsNumber()
  commission?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  imageUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  affiliateLink?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  productLink?: string;

  @ApiPropertyOptional()
  @IsOptional()
  rawData?: Record<string, unknown>;
}

export class UpdateProductStatusDto {
  @ApiProperty({ enum: ProductStatus })
  @IsEnum(ProductStatus)
  status!: ProductStatus;
}
