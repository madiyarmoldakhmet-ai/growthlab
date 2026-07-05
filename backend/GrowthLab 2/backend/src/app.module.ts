import { Module } from '@nestjs/common';
import { AdminModule } from './admin/admin.module';
import { AiModule } from './ai';
import { AuthModule } from './auth';
import { CampaignsModule } from './campaigns/campaigns.module';
import { ContactsModule } from './contacts/contacts.module';
import { GmailModule } from './gmail';
import { WhatsappModule } from './whatsapp';

@Module({
  imports: [
    AdminModule,
    AuthModule,
    ContactsModule,
    CampaignsModule,
    WhatsappModule,
    AiModule,
    GmailModule,
  ],
})
export class AppModule {}
