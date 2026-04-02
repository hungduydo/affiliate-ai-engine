import { Controller, Get, Param, Query } from '@nestjs/common';
import { PromptTemplatesService } from '../application/prompt-templates.service';
import { PublishProviderService } from '../application/publish-provider.service';

/**
 * Internal API for other modules to fetch config data
 * No authentication required for internal service-to-service calls
 */
@Controller('internal')
export class ConfigInternalController {
  constructor(
    private promptTemplatesService: PromptTemplatesService,
    private publishProviderService: PublishProviderService,
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
}
