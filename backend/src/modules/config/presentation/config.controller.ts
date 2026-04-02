import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PromptTemplatesService } from '../application/prompt-templates.service';
import { PublishProviderService, CreateProviderDto, UpdateProviderDto } from '../application/publish-provider.service';

@Controller('config')
export class ConfigController {
  constructor(
    private promptTemplatesService: PromptTemplatesService,
    private configService: ConfigService,
    private publishProviderService: PublishProviderService,
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

  // ---------------------------------------------------------------------------
  // Publishing providers
  // ---------------------------------------------------------------------------

  @Get('providers')
  async getProviders(
    @Query('platform') platform?: string,
    @Query('isActive') isActive?: string,
  ) {
    const providers = await this.publishProviderService.findAll({
      platform,
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
    });
    // Never expose credentials to the frontend
    return {
      data: providers.map(({ credentials: _credentials, ...rest }) => rest),
    };
  }

  @Get('providers/:id')
  async getProviderById(@Param('id') id: string) {
    const { credentials: _credentials, ...rest } = await this.publishProviderService.findById(id);
    return rest;
  }

  @Post('providers')
  async createProvider(@Body() body: CreateProviderDto) {
    const { credentials: _credentials, ...rest } = await this.publishProviderService.create(body);
    return rest;
  }

  @Put('providers/:id')
  async updateProvider(@Param('id') id: string, @Body() body: UpdateProviderDto) {
    const { credentials: _credentials, ...rest } = await this.publishProviderService.update(id, body);
    return rest;
  }

  @Delete('providers/:id')
  async deleteProvider(@Param('id') id: string) {
    await this.publishProviderService.delete(id);
    return { success: true };
  }
}
