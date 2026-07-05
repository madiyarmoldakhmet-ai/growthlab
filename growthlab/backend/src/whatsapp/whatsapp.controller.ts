import { Body, Controller, Get, Post } from '@nestjs/common';
import { SendWhatsappMessageDto } from './dto/send-whatsapp-message.dto';
import { WhatsappService } from './whatsapp.service';
import {
  WhatsappConnectionState,
  WhatsappMessageRecord,
  WhatsappSendResult,
} from './types/whatsapp.types';

@Controller('whatsapp')
export class WhatsappController {
  constructor(private readonly whatsappService: WhatsappService) {}

  @Post('connect')
  connect(): Promise<WhatsappConnectionState> {
    return this.whatsappService.connect();
  }

  @Post('disconnect')
  disconnect(): Promise<WhatsappConnectionState> {
    return this.whatsappService.disconnect();
  }

  @Get('status')
  getStatus(): WhatsappConnectionState {
    return this.whatsappService.getStatus();
  }

  @Get('qr')
  getQr(): { qr?: string; status: WhatsappConnectionState['status'] } {
    return this.whatsappService.getQr();
  }

  @Post('messages')
  sendMessage(
    @Body() sendMessageDto: SendWhatsappMessageDto,
  ): Promise<WhatsappSendResult> {
    return this.whatsappService.sendMessage(sendMessageDto);
  }

  @Get('messages')
  getMessages(): WhatsappMessageRecord[] {
    return this.whatsappService.getMessages();
  }

  @Get('messages/incoming')
  getIncomingMessages(): WhatsappMessageRecord[] {
    return this.whatsappService.getIncomingMessages();
  }

  @Get('messages/statuses')
  getMessageStatuses(): WhatsappMessageRecord[] {
    return this.whatsappService.getMessageStatuses();
  }
}
