import { Module } from '@nestjs/common';
import { EmailWorkerService } from './email-worker.service';
import { PrismaModule } from '../prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [EmailWorkerService],
  exports: [EmailWorkerService],
})
export class EmailWorkerModule {}