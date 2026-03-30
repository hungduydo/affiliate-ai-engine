import { IsString, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Platform, ContentType, ContentStatus } from '@prisma/client';

export class CreateContentDto {
  @ApiProperty()
  @IsString()
  productId!: string;

  @ApiProperty({ enum: Platform })
  @IsEnum(Platform)
  platform!: Platform;

  @ApiProperty({ enum: ContentType })
  @IsEnum(ContentType)
  contentType!: ContentType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  body?: string;

  @ApiPropertyOptional()
  @IsOptional()
  promptId?: string;
}

export class GenerateContentDto {
  @ApiProperty()
  @IsString()
  productId!: string;

  @ApiProperty({ enum: Platform })
  @IsEnum(Platform)
  platform!: Platform;

  @ApiProperty({ enum: ContentType })
  @IsEnum(ContentType)
  contentType!: ContentType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  promptId?: string;
}

export class UpdateContentStatusDto {
  @ApiProperty({ enum: ContentStatus })
  @IsEnum(ContentStatus)
  status!: ContentStatus;
}
