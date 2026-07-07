import {
  Body,
  Controller,
  Headers,
  Param,
  Post,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'crypto';
import { AppConfiguration } from '../config/configuration';
import { EmailWebhookDto } from './dto/email-webhook.dto';
import { SendingService } from './sending.service';

@Controller('webhooks')
export class WebhooksController {
  constructor(
    private readonly sendingService: SendingService,
    private readonly config: ConfigService<AppConfiguration, true>,
  ) {}

  @Post('email/:provider')
  ingest(
    @Param('provider') provider: string,
    @Headers('x-webhook-secret') secret: string | undefined,
    @Body() body: EmailWebhookDto,
  ) {
    this.verifySecret(secret);
    return this.sendingService.ingestWebhook(provider, body.events);
  }

  private verifySecret(provided: string | undefined): void {
    const expected = this.config.get('sending.webhookSecret', { infer: true }) ?? '';
    if (!expected) {
      throw new ServiceUnavailableException({
        code: 'webhook_not_configured',
        message: 'WEBHOOK_SECRET is not set; webhook intake is disabled.',
      });
    }
    if (!provided || !this.safeEquals(provided, expected)) {
      throw new UnauthorizedException('Invalid webhook secret');
    }
  }

  private safeEquals(a: string, b: string): boolean {
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);
    return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
  }
}
