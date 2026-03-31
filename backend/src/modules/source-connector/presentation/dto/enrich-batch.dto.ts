import { IsArray, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class EnrichBatchDto {
  @ApiProperty({ type: [String], example: ['clx1abc', 'clx2def'] })
  @IsArray()
  @IsString({ each: true })
  productIds!: string[];
}
