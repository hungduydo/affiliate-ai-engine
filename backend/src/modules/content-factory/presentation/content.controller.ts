import { Controller, Get, Post, Put, Patch, Param, Body, Query, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { ContentService } from '../application/content.service';
import { CreateContentDto, UpdateContentStatusDto, GenerateContentDto } from './dto/create-content.dto';
import { UpdateContentDto } from './dto/update-content.dto';
import { ContentStatus, Platform, ContentType } from '@prisma/client';
import { QueueService } from '../../queue-engine/queue.service';
import { QUEUE_NAMES, JobName } from '../../queue-engine/queue.constants';

@ApiTags('content')
@Controller('content')
export class ContentController {
  constructor(
    private readonly contentService: ContentService,
    private readonly queueService: QueueService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List content with pagination and filters' })
  @ApiQuery({ name: 'productId', required: false })
  @ApiQuery({ name: 'platform', required: false, enum: Platform })
  @ApiQuery({ name: 'status', required: false, enum: ContentStatus })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  findAll(
    @Query('productId') productId?: string,
    @Query('platform') platform?: Platform,
    @Query('status') status?: ContentStatus,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.contentService.findMany({ productId, platform, status, page, limit });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get content by ID' })
  findOne(@Param('id') id: string) {
    return this.contentService.findById(id);
  }

  /**
   * Create a RAW content record and immediately queue AI generation.
   * Returns contentId + jobId for polling.
   */
  @Post()
  @ApiOperation({ summary: 'Create content and trigger AI generation' })
  async generate(@Body() dto: GenerateContentDto) {
    const content = await this.contentService.create({
      productId: dto.productId,
      platform: dto.platform,
      contentType: dto.contentType,
      promptId: dto.promptId,
      body: '',
    });

    const jobId = await this.queueService.addJob(
      QUEUE_NAMES.CONTENT_GENERATION,
      JobName.GENERATE_CONTENT,
      { contentId: content.id },
    );

    return { contentId: content.id, jobId };
  }

  /**
   * Re-trigger generation on an existing content item (RAW or FAILED status).
   */
  @Post(':id/generate')
  @ApiOperation({ summary: 'Trigger AI generation for existing content' })
  async triggerGenerate(@Param('id') id: string) {
    const content = await this.contentService.findById(id);
    const allowedStatuses: ContentStatus[] = [ContentStatus.RAW, ContentStatus.FAILED];
    if (!allowedStatuses.includes(content.status)) {
      throw new BadRequestException(
        `Cannot re-generate content with status ${content.status}. Must be RAW or FAILED.`,
      );
    }

    // Reset to RAW so generation service can proceed
    await this.contentService.updateStatus(id, ContentStatus.RAW);

    const jobId = await this.queueService.addJob(
      QUEUE_NAMES.CONTENT_GENERATION,
      JobName.GENERATE_CONTENT,
      { contentId: id },
    );

    return { contentId: id, jobId };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update content title and/or body' })
  update(@Param('id') id: string, @Body() dto: UpdateContentDto) {
    return this.contentService.update(id, dto);
  }

  @Put(':id/status')
  @ApiOperation({ summary: 'Update content status' })
  updateStatus(@Param('id') id: string, @Body() dto: UpdateContentStatusDto) {
    return this.contentService.updateStatus(id, dto.status);
  }
}
