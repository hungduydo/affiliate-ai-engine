import { Controller, Get, Post, Param, Query, Body } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsDateString,
  IsUrl,
  IsIn,
  ValidateNested,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';
import { firstValueFrom } from 'rxjs';
import { PublishingService } from '../application/publishing.service';
import { Platform, PublishStatus } from '@prisma-client/distribution-hub';
import { QueueService } from '../../queue-engine/queue.service';
import { QUEUE_NAMES, JobName } from '../../queue-engine/queue.constants';

class AssetDto {
  @ApiProperty()
  @IsUrl()
  url!: string;

  @ApiProperty({ enum: ['image', 'video'] })
  @IsIn(['image', 'video'])
  type!: 'image' | 'video';
}

class PublishDto {
  @ApiProperty()
  @IsString()
  contentId!: string;

  @ApiProperty()
  @IsString()
  platform!: string;

  @ApiProperty({ description: 'PublishProvider.id from config_db' })
  @IsString()
  providerId!: string;

  @ApiPropertyOptional({ description: 'ISO 8601 UTC datetime — schedules the publish for a future time' })
  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @ApiPropertyOptional({ type: [AssetDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AssetDto)
  assets?: AssetDto[];
}

@ApiTags('publishing')
@Controller('publishing')
export class PublishingController {
  private readonly internalBase: string;

  constructor(
    private readonly publishingService: PublishingService,
    private readonly queueService: QueueService,
    private readonly http: HttpService,
    config: ConfigService,
  ) {
    this.internalBase = config.get<string>('BACKEND_INTERNAL_URL', 'http://localhost:3000');
  }

  @Get('providers')
  @ApiOperation({ summary: 'List providers available for a given platform' })
  @ApiQuery({ name: 'platform', required: false })
  async getProviders(@Query('platform') platform?: string) {
    const res = await firstValueFrom(
      this.http.get(`${this.internalBase}/api/internal/providers`, {
        params: { platform },
      }),
    );
    return res.data;
  }

  @Get('logs')
  @ApiOperation({ summary: 'List all publish logs' })
  @ApiQuery({ name: 'contentId', required: false })
  @ApiQuery({ name: 'platform', required: false, enum: Platform })
  @ApiQuery({ name: 'status', required: false, enum: PublishStatus })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  findLogs(
    @Query('contentId') contentId?: string,
    @Query('platform') platform?: Platform,
    @Query('status') status?: PublishStatus,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.publishingService.findLogs({ contentId, platform, status, page, limit });
  }

  @Get('logs/:id')
  @ApiOperation({ summary: 'Get publish log by ID' })
  findLog(@Param('id') id: string) {
    return this.publishingService.findLogById(id);
  }

  @Post('publish')
  @ApiOperation({ summary: 'Queue content for publishing to a platform' })
  async publish(@Body() dto: PublishDto) {
    // Resolve provider key from config_db
    const providerRes = await firstValueFrom(
      this.http.get<{ id: string; key: string; label: string }>(
        `${this.internalBase}/api/internal/providers/${dto.providerId}`,
      ),
    );
    const providerKey = providerRes.data.key;

    const log = await this.publishingService.createLog({
      contentId: dto.contentId,
      platform: dto.platform as Platform,
      provider: providerKey,
      providerId: dto.providerId,
      scheduledAt: dto.scheduledAt,
      assets: dto.assets,
    });

    // Calculate BullMQ delay for scheduled jobs
    const delay = dto.scheduledAt
      ? Math.max(0, new Date(dto.scheduledAt).getTime() - Date.now())
      : undefined;

    const jobId = await this.queueService.addJob(
      QUEUE_NAMES.DISTRIBUTION,
      JobName.PUBLISH_CONTENT,
      { publishLogId: log.id },
      delay ? { delay } : undefined,
    );

    return { publishLogId: log.id, jobId };
  }
}
