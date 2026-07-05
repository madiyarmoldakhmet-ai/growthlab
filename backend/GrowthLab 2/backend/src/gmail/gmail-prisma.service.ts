import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class GmailPrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(GmailPrismaService.name);

  async onModuleInit() {
    if (process.env.DATABASE_CONNECT_ON_START !== 'true') {
      return;
    }

    try {
      await this.$connect();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown Prisma connection error';
      this.logger.warn(`Database connection was not established on startup: ${message}`);
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
