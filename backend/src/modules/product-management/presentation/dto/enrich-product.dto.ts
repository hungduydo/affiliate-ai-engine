import { IsOptional, IsString, IsUrl, IsNumber, IsArray, ValidateNested, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { EnrichStatus } from '@prisma-client/product-management';

export class ProductImageDto {
  @IsUrl()
  url!: string;

  @IsOptional()
  isPrimary?: boolean;
}

export class ProductVideoDto {
  @IsUrl()
  url!: string;

  @IsOptional()
  @IsUrl()
  thumbnailUrl?: string;
}

export class EnrichProductDto {
  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsUrl()
  primaryImageUrl?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductImageDto)
  images?: ProductImageDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductVideoDto)
  videos?: ProductVideoDto[];

  @IsOptional()
  @IsNumber()
  rating?: number;

  @IsOptional()
  @IsNumber()
  reviewCount?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  categories?: string[];

  @IsOptional()
  @IsEnum(EnrichStatus)
  enrichStatus?: EnrichStatus;
}
