import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '../../../node_modules/.prisma/flow-accounts-client';

@Injectable()
export class FlowAccountsPrisma implements OnModuleDestroy {
  private prisma: PrismaClient | null = null;

  constructor(private configService: ConfigService) {
    this.initializeClient();
  }

  private initializeClient() {
    const databaseUrl = this.configService.get<string>('FLOW_ACCOUNTS_DB_URL');
    if (!databaseUrl) {
      console.warn('FLOW_ACCOUNTS_DB_URL is not configured, FlowAccountsPrisma disabled');
      return;
    }
    try {
      const originalUrl = process.env.DATABASE_URL;
      process.env.DATABASE_URL = databaseUrl;
      this.prisma = new PrismaClient();
      if (originalUrl) {
        process.env.DATABASE_URL = originalUrl;
      } else {
        delete process.env.DATABASE_URL;
      }
    } catch (error) {
      console.warn('Failed to initialize FlowAccountsPrisma:', error);
    }
  }

  async onModuleDestroy() {
    if (this.prisma) {
      await this.prisma.$disconnect();
    }
  }

  get client() {
    if (!this.prisma) {
      throw new Error('FlowAccountsPrisma is not initialized. Check FLOW_ACCOUNTS_DB_URL configuration.');
    }
    return this.prisma;
  }
}
