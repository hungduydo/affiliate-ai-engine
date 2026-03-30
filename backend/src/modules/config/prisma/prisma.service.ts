import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma-client/config';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const { Pool } = pg;

@Injectable()
export class ConfigPrismaService extends PrismaClient implements OnModuleInit {
  private readonly logger = new Logger('ConfigPrismaService');

  constructor(private configService: ConfigService) {
    const databaseUrl = configService.get<string>('DATABASE_URL_CONFIG');

    if (!databaseUrl) {
      throw new Error('DATABASE_URL_CONFIG environment variable is not set');
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
      this.logger.log('✅ Config database connected');
    } catch (error) {
      this.logger.error('❌ Failed to connect to config database', error);
      throw error;
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
