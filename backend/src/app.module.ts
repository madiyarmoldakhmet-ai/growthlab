import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { configuration } from './config/configuration';
import { validateEnv } from './config/env.validation';
import { PrismaModule } from './prisma.module';
import { AiModule } from './ai';
import { AuthModule } from './auth';
import { CampaignsModule } from './campaigns/campaigns.module';
import { SendingAccountsModule } from './sending-accounts/sending-accounts.module';
import { InstagramModule } from './channels/instagram/instagram.module';
import { ContactsModule } from './contacts/contacts.module';
import { CrmContactsModule } from './crm-contacts/crm-contacts.module';
import { GmailModule } from './gmail';
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
    CrmContactsModule,
    CampaignsModule,
    ContactsModule,
    VerificationModule,
    PersonalizationModule,
    SendingAccountsModule,
    InstagramModule,
    SendingModule,
    WhatsappModule,
    AiModule,
    GmailModule,
  ],
})
export class AppModule {}
