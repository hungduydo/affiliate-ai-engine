import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PromptTemplatesService } from '../application/prompt-templates.service';

@Controller('api/config')
export class ConfigController {
  constructor(
    private promptTemplatesService: PromptTemplatesService,
    private configService: ConfigService,
  ) {}

  @Get('prompts')
  async getAllPrompts(
    @Query('isActive') isActive?: boolean,
    @Query('platform') platform?: string,
    @Query('contentType') contentType?: string,
  ) {
    const templates = await this.promptTemplatesService.getAllTemplates({
      isActive: isActive !== undefined ? Boolean(isActive) : undefined,
      platform,
      contentType,
    });
    return { data: templates };
  }

  @Get('prompts/:id')
  async getPromptById(@Param('id') id: string) {
    return await this.promptTemplatesService.getTemplateById(id);
  }

  @Post('prompts')
  async createPrompt(
    @Body()
    body: {
      name: string;
      platform: string;
      contentType: string;
      template: string;
      isActive?: boolean;
    },
  ) {
    return await this.promptTemplatesService.createTemplate(body);
  }

  @Put('prompts/:id')
  async updatePrompt(
    @Param('id') id: string,
    @Body()
    body: {
      name?: string;
      template?: string;
      isActive?: boolean;
    },
  ) {
    return await this.promptTemplatesService.updateTemplate(id, body);
  }

  @Delete('prompts/:id')
  async deletePrompt(@Param('id') id: string) {
    return await this.promptTemplatesService.deleteTemplate(id);
  }

  @Get('connector-status')
  getConnectorStatus() {
    const has = (key: string) => !!this.configService.get<string>(key);
    return {
      clickbank: has('CLICKBANK_DEV_API_KEY'),
      cj: has('CJ_API_TOKEN'),
      shopee: has('SHOPEE_COOKIE_FILE_PATH'),
      wordpress: has('WORDPRESS_URL') && has('WORDPRESS_USERNAME') && has('WORDPRESS_APP_PASSWORD'),
      facebook: has('FACEBOOK_PAGE_ID') && has('FACEBOOK_ACCESS_TOKEN'),
      shopify: has('SHOPIFY_STORE_URL') && has('SHOPIFY_ACCESS_TOKEN') && has('SHOPIFY_BLOG_ID'),
      gemini: has('GOOGLE_API_KEY'),
    };
  }
}
