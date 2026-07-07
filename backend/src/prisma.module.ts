import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

/**
 * Single source of the Prisma client across the app.
 * Global so any module can inject PrismaService without importing this module.
 */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
