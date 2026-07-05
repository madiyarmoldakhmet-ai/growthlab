import { Module } from '@nestjs/common';
import { AiModule } from '../ai';
import { ContactsModule } from '../contacts/contacts.module';
import { GmailModule } from '../gmail';
import { PrismaService } from '../prisma.service';
import { WhatsappModule } from '../whatsapp';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [AiModule, ContactsModule, GmailModule, WhatsappModule],
  controllers: [AdminController],
  providers: [AdminService, PrismaService],
})
export class AdminModule {}
