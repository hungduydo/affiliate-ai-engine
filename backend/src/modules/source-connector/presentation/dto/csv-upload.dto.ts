import { IsString, IsObject, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CsvConfirmDto {
  @ApiProperty({ example: '/tmp/uploads/abc.csv' })
  @IsString()
  filePath!: string;

  @ApiProperty({ example: 'shopee', enum: ['shopee', 'trending-video'] })
  @IsString()
  @IsIn(['shopee', 'trending-video'])
  source!: string;

  @ApiProperty({
    description: 'Maps CSV header names to ScrapedProduct field names',
    example: { 'Product Name': 'name', SKU: 'externalId', Price: 'price' },
  })
  @IsObject()
  mapping!: Record<string, string>;
}
