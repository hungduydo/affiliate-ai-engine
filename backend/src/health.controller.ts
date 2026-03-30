import { Controller, Get, Inject } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    @Inject('ProductPrismaService') private productPrisma: any,
    @Inject('ContentPrismaService') private contentPrisma: any,
    @Inject('PublishPrismaService') private publishPrisma: any,
    @Inject('ConfigPrismaService') private configPrisma: any,
    private readonly config: ConfigService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Health check — All 4 DBs and Redis status' })
  async check() {
    const databases = await this.checkDatabases();
    const redisOk = await this.checkRedis();

    const allDbsOk = Object.values(databases).every((status) => status === 'ok');

    return {
      status: allDbsOk && redisOk ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      services: {
        databases,
        redis: redisOk ? 'connected' : 'disconnected',
      },
    };
  }

  private async checkDatabases(): Promise<Record<string, string>> {
    const result: Record<string, string> = {};

    const dbChecks = [
      { name: 'products_db', prisma: this.productPrisma },
      { name: 'content_db', prisma: this.contentPrisma },
      { name: 'publish_db', prisma: this.publishPrisma },
      { name: 'config_db', prisma: this.configPrisma },
    ];

    for (const { name, prisma } of dbChecks) {
      try {
        await prisma.$queryRaw`SELECT 1`;
        result[name] = 'ok';
      } catch {
        result[name] = 'disconnected';
      }
    }

    return result;
  }

  private async checkRedis(): Promise<boolean> {
    let client: Redis | null = null;
    try {
      const redisUrl = this.config.get<string>(
        'REDIS_URL',
        'redis://localhost:6379',
      );
      client = new Redis(redisUrl, {
        connectTimeout: 3000,
        lazyConnect: true,
      });
      await client.connect();
      await client.ping();
      return true;
    } catch {
      return false;
    } finally {
      await client?.quit();
    }
  }
}
