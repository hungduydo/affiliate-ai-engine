import { Controller, Get, Put, Param, Query, Body } from '@nestjs/common';
import { PromptTemplatesService } from '../application/prompt-templates.service';
import { PublishProviderService } from '../application/publish-provider.service';
import { DiscoveryCacheService, DiscoverProduct } from '../application/discovery-cache.service';

/**
 * Internal API for other modules to fetch config data
 * No authentication required for internal service-to-service calls
 */
@Controller('internal')
export class ConfigInternalController {
  constructor(
    private promptTemplatesService: PromptTemplatesService,
    private publishProviderService: PublishProviderService,
    private discoveryCacheService: DiscoveryCacheService,
  ) {}

  @Get('prompts')
  async getPrompts(
    @Query('isActive') isActive?: string,
    @Query('platform') platform?: string,
    @Query('contentType') contentType?: string,
  ) {
    const templates = await this.promptTemplatesService.getAllTemplates({
      isActive: isActive === 'true' ? true : isActive === 'false' ? false : true,
      platform,
      contentType,
    });
    return { data: templates };
  }

  @Get('prompts/:id')
  async getPromptById(@Param('id') id: string) {
    return await this.promptTemplatesService.getTemplateById(id);
  }

  // Providers — used by distribution-hub at publish time (includes credentials)
  @Get('providers')
  async getProviders(@Query('platform') platform?: string) {
    return {
      data: await this.publishProviderService.findAll({
        platform,
        isActive: true,
      }),
    };
  }

  @Get('providers/:id')
  async getProviderById(@Param('id') id: string) {
    return await this.publishProviderService.findById(id);
  }

  @Get('discovery-cache')
  async getDiscoveryCache() {
    return await this.discoveryCacheService.get();
  }

  @Put('discovery-cache')
  async setDiscoveryCache(
    @Body() body: {
      data: DiscoverProduct[];
      updatedAt: string;
      partial?: boolean;
      failedAdvertisers?: { name: string; error: string }[];
    },
  ) {
    await this.discoveryCacheService.set(body);
    return { ok: true };
  }
}
