import { Controller, Get, Param, Query } from '@nestjs/common';
import { PublishingService } from '../application/publishing.service';

/**
 * Internal API for other modules to fetch publish log data
 * No authentication required for internal service-to-service calls
 */
@Controller('api/internal/publish-logs')
export class PublishingInternalController {
  constructor(private publishingService: PublishingService) {}

  @Get()
  async getAllPublishLogs(
    @Query('contentId') contentId?: string,
    @Query('status') status?: string,
    @Query('platform') platform?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return await this.publishingService.getPublishLogs({
      contentId,
      status,
      platform,
      page: parseInt(page || '1'),
      pageSize: parseInt(pageSize || '10'),
    });
  }

  @Get(':id')
  async getPublishLogById(@Param('id') id: string) {
    return await this.publishingService.getPublishLogById(id);
  }
}
