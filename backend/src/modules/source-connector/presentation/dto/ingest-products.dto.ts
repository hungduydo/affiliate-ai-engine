import { IsString, IsNumber, IsIn, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class IngestProductsDto {
  @ApiProperty({ example: 'shopee', enum: ['shopee', 'trending-video'] })
  @IsString()
  @IsIn(['shopee', 'trending-video'])
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
