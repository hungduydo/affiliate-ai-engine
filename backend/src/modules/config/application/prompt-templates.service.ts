import { Injectable, Logger } from '@nestjs/common';
import { ConfigPrismaService } from '../prisma/prisma.service';

@Injectable()
export class PromptTemplatesService {
  private readonly logger = new Logger('PromptTemplatesService');

  constructor(private prisma: ConfigPrismaService) {}

  async getAllTemplates(filters?: { isActive?: boolean; platform?: string; contentType?: string }) {
    try {
      const templates = await this.prisma.promptTemplate.findMany({
        where: {
          ...(filters?.isActive !== undefined && { isActive: filters.isActive }),
          ...(filters?.platform && { platform: filters.platform as any }),
          ...(filters?.contentType && { contentType: filters.contentType as any }),
        },
      });
      return templates;
    } catch (error) {
      this.logger.error('Error fetching prompt templates', error);
      throw error;
    }
  }

  async getTemplateById(id: string) {
    try {
      const template = await this.prisma.promptTemplate.findUnique({
        where: { id },
      });
      return template;
    } catch (error) {
      this.logger.error(`Error fetching prompt template ${id}`, error);
      throw error;
    }
  }

  async createTemplate(data: {
    name: string;
    platform: string;
    contentType: string;
    template: string;
    isActive?: boolean;
  }) {
    try {
      const created = await this.prisma.promptTemplate.create({
        data: {
          name: data.name,
          platform: data.platform as any,
          contentType: data.contentType as any,
          template: data.template,
          isActive: data.isActive ?? true,
        },
      });
      return created;
    } catch (error) {
      this.logger.error('Error creating prompt template', error);
      throw error;
    }
  }

  async updateTemplate(
    id: string,
    data: {
      name?: string;
      template?: string;
      isActive?: boolean;
    },
  ) {
    try {
      const updated = await this.prisma.promptTemplate.update({
        where: { id },
        data,
      });
      return updated;
    } catch (error) {
      this.logger.error(`Error updating prompt template ${id}`, error);
      throw error;
    }
  }

  async deleteTemplate(id: string) {
    try {
      const deleted = await this.prisma.promptTemplate.delete({
        where: { id },
      });
      return deleted;
    } catch (error) {
      this.logger.error(`Error deleting prompt template ${id}`, error);
      throw error;
    }
  }
}
