import { Module } from '@nestjs/common';
import { GmailController } from './gmail.controller';
import { GmailPrismaService } from './gmail-prisma.service';
import { GmailService } from './gmail.service';

@Module({
  controllers: [GmailController],
  providers: [GmailService, GmailPrismaService],
  exports: [GmailService],
})
export class GmailModule {}
