import { Module } from '@nestjs/common';
import { EmailWorkerModule } from '../email-worker/email-worker.module';
import { InstagramModule } from '../instagram/instagram.module';
import { CleanMvpController } from './clean-mvp.controller';
import { CleanMvpService } from './clean-mvp.service';

@Module({
  imports: [InstagramModule, EmailWorkerModule],
  controllers: [CleanMvpController],
  providers: [CleanMvpService],
})
export class CleanMvpModule {}