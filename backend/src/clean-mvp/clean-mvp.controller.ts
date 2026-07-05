import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { CleanMvpService } from './clean-mvp.service';
import { EmailWorkerService } from '../email-worker/email-worker.service';
import {
  CreateCampaignDto,
  CreateContactDto,
  CreateSendingAccountDto,
  parseChannelType,
  SendEmailDto,
  SendInstagramDto,
  SendWhatsappDto,
} from './clean-mvp.dto';

@Controller('clean-mvp')
export class CleanMvpController {
  constructor(
    private readonly service: CleanMvpService,
    private readonly emailWorkerService: EmailWorkerService,
  ) {}

  @Post('seed')
  seed() {
    return this.service.seed();
  }

  @Get('campaigns')
  listCampaigns() {
    return this.service.listCampaigns();
  }

  @Post('campaigns')
  createCampaign(@Body() dto: CreateCampaignDto) {
    return this.service.createCampaign(dto);
  }

  @Get('campaigns/:id/contacts')
  listContacts(@Param('id') id: string) {
    return this.service.listContacts(id);
  }

  @Post('contacts')
  createContact(@Body() dto: CreateContactDto) {
    return this.service.createContact(dto);
  }

  @Post('send-email')
  sendEmail(@Body() dto: SendEmailDto) {
    return this.service.sendEmail(dto.contactId, dto.text);
  }

  @Post('send-whatsapp')
  sendWhatsapp(@Body() dto: SendWhatsappDto) {
    return this.service.sendWhatsapp(dto.contactId, dto.text);
  }

  // ─── Instagram (Puppeteer) ───────────────────────────────────────────
  @Post('accounts')
  createAccount(@Body() dto: CreateSendingAccountDto) {
    return this.service.createSendingAccount(dto);
  }

  @Get('accounts')
  listAccounts() {
    return this.service.listSendingAccounts();
  }

  @Post('send-instagram')
  sendInstagram(@Body() dto: SendInstagramDto) {
    return this.service.sendInstagram(dto.contactId, dto.text);
  }

  // Convenience for the Queue screen.
  @Get('queue')
  queue() {
    return this.service.listFunnelContacts();
  }

  // ─── Email Worker (Nodemailer) ─────────────────────────────────────────
  @Post('start-email-worker')
  startEmailWorker() {
    // Запускаем воркер неблокирующе
    this.emailWorkerService.startMassEmailWorker();
    return { message: 'Email воркер запущен' };
  }
}