import { Module } from '@nestjs/common';
import { AuthModule } from '../auth';
import { GmailModule } from '../gmail';
import { EmailSender } from './email.sender';
import { SendingController } from './sending.controller';
import { SendingService } from './sending.service';
import { WebhooksController } from './webhooks.controller';

@Module({
  imports: [AuthModule, GmailModule],
  controllers: [SendingController, WebhooksController],
  providers: [SendingService, EmailSender],
  exports: [SendingService],
})
export class SendingModule {}
