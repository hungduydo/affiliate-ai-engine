import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const { Pool } = pg;

@Injectable()
export class ContentPrismaService extends PrismaClient implements OnModuleInit {
  private readonly logger = new Logger('ContentPrismaService');

  constructor(private configService: ConfigService) {
    const databaseUrl = configService.get<string>('DATABASE_URL_CONTENT');

    if (!databaseUrl) {
      throw new Error('DATABASE_URL_CONTENT environment variable is not set');
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
      this.logger.log('✅ Content Factory database connected');
    } catch (error) {
      this.logger.error('❌ Failed to connect to content factory database', error);
      throw error;
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
