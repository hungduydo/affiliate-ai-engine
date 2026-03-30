import { Controller, Get, Put, Param, Query, Body } from '@nestjs/common';
import { ContentService } from '../application/content.service';
import { ContentStatus } from '@prisma/client';

/**
 * Internal API for other modules to fetch content data
 * No authentication required for internal service-to-service calls
 */
@Controller('api/internal/content')
export class ContentInternalController {
  constructor(private contentService: ContentService) {}

  @Get()
  async getAllContent(
    @Query('platform') platform?: string,
    @Query('status') status?: string,
    @Query('productId') productId?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return await this.contentService.getContent({
      platform,
      status,
      productId,
      page: parseInt(page || '1'),
      pageSize: parseInt(pageSize || '10'),
    });
  }

  @Get(':id')
  async getContentById(@Param('id') id: string) {
    return await this.contentService.getContentById(id);
  }

  @Put(':id/status')
  async updateContentStatus(
    @Param('id') id: string,
    @Body() body: { status: ContentStatus },
  ) {
    return await this.contentService.updateStatus(id, body.status);
  }
}
