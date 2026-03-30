import { Controller, Get, Param, Query } from '@nestjs/common';
import { PromptTemplatesService } from '../application/prompt-templates.service';

/**
 * Internal API for other modules to fetch config data
 * No authentication required for internal service-to-service calls
 */
@Controller('api/internal/prompts')
export class ConfigInternalController {
  constructor(private promptTemplatesService: PromptTemplatesService) {}

  @Get()
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

  @Get(':id')
  async getPromptById(@Param('id') id: string) {
    return await this.promptTemplatesService.getTemplateById(id);
  }
}
