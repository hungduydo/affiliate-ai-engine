import { Controller, Get, Post, Param, Query, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { IsEnum, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PublishingService } from '../application/publishing.service';
import { Platform, PublishStatus } from '@prisma/client';
import { QueueService } from '../../queue-engine/queue.service';
import { QUEUE_NAMES, JobName } from '../../queue-engine/queue.constants';

class PublishDto {
  @ApiProperty()
  @IsString()
  contentId!: string;

  @ApiProperty({ enum: Platform })
  @IsEnum(Platform)
  platform!: Platform;
}

@ApiTags('publishing')
@Controller('publishing')
export class PublishingController {
  constructor(
    private readonly publishingService: PublishingService,
    private readonly queueService: QueueService,
  ) {}

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
    const log = await this.publishingService.createLog({
      contentId: dto.contentId,
      platform: dto.platform,
    });

    const jobId = await this.queueService.addJob(
      QUEUE_NAMES.DISTRIBUTION,
      JobName.PUBLISH_CONTENT,
      { publishLogId: log.id },
    );

    return { publishLogId: log.id, jobId };
  }
}
