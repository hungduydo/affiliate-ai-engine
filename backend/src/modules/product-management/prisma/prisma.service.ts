import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const { Pool } = pg;

@Injectable()
export class ProductPrismaService extends PrismaClient implements OnModuleInit {
  private readonly logger = new Logger('ProductPrismaService');

  constructor(private configService: ConfigService) {
    const databaseUrl = configService.get<string>('DATABASE_URL_PRODUCTS');

    if (!databaseUrl) {
      throw new Error('DATABASE_URL_PRODUCTS environment variable is not set');
    }

    const connectionString = databaseUrl;
    const pool = new Pool({ connectionString });
    const adapter = new PrismaPg(pool);

    super({
      adapter,
      log: [
        { emit: 'stdout', level: 'query' },
        { emit: 'stdout', level: 'error' },
      ],
    });
  }

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('✅ Product Management database connected');
    } catch (error) {
      this.logger.error('❌ Failed to connect to product management database', error);
      throw error;
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
