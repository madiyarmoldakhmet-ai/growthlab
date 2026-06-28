import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { configuration } from './config/configuration';
import { validateEnv } from './config/env.validation';
import { PrismaModule } from './prisma.module';
import { AiModule } from './ai';
import { AuthModule } from './auth';
import { CampaignsModule } from './campaigns/campaigns.module';
import { ChannelsModule } from './channels/channels.module';
import { ContactsModule } from './contacts/contacts.module';
import { GmailModule } from './gmail';
import { LeadsModule } from './leads/leads.module';
import { PersonalizationModule } from './personalization/personalization.module';
import { SendingModule } from './sending/sending.module';
import { VerificationModule } from './verification/verification.module';
import { WhatsappModule } from './whatsapp';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      load: [configuration],
      validate: validateEnv,
    }),
    PrismaModule,
    AuthModule,
    ContactsModule,
    CampaignsModule,
    LeadsModule,
    VerificationModule,
    PersonalizationModule,
    ChannelsModule,
    SendingModule,
    WhatsappModule,
    AiModule,
    GmailModule,
  ],
})
export class AppModule {}
