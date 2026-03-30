import { IsString, IsNumber, IsIn, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class IngestProductsDto {
  @ApiProperty({ example: 'clickbank', enum: ['clickbank', 'cj', 'shopee'] })
  @IsString()
  @IsIn(['clickbank', 'cj', 'shopee'])
  source!: string;

  @ApiProperty({ example: 'weight loss' })
  @IsString()
  keyword!: string;

  @ApiProperty({ example: 50, minimum: 1, maximum: 500 })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(500)
  limit: number = 50;
}
