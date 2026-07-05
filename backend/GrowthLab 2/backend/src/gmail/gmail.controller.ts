import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
  Redirect,
} from '@nestjs/common';
import { SendGmailDto } from './dto/send-gmail.dto';
import { SyncGmailRepliesDto } from './dto/sync-gmail-replies.dto';
import { UpsertGmailOAuthDto } from './dto/upsert-gmail-oauth.dto';
import { GmailService } from './gmail.service';

@Controller('gmail')
export class GmailController {
  constructor(private readonly gmailService: GmailService) {}

  @Put('oauth')
  upsertOAuth(@Body() dto: UpsertGmailOAuthDto) {
    return this.gmailService.upsertOAuth(dto);
  }

  @Get('oauth/url')
  getOAuthUrl() {
    return this.gmailService.getOAuthUrl();
  }

  @Get('oauth/start')
  @Redirect(undefined, 302)
  startOAuth() {
    return {
      url: this.gmailService.getOAuthUrl().url,
    };
  }

  @Get('oauth/callback')
  handleOAuthCallback(@Query('code') code: string) {
    return this.gmailService.handleOAuthCallback(code);
  }

  @Get('status/:userId')
  getStatus(@Param('userId') userId: string) {
    return this.gmailService.getStatus(userId);
  }

  @Post('send')
  send(@Body() dto: SendGmailDto) {
    return this.gmailService.send(dto);
  }

  @Post('sync-replies')
  syncReplies(@Body() dto: SyncGmailRepliesDto) {
    return this.gmailService.syncReplies(dto);
  }
}
