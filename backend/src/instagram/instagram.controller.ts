import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { FastifyRequest } from 'fastify';
import { IsString, MinLength } from 'class-validator';
import { IgConnectService } from './ig-connect.service';
import {
  InstagramWebhookService,
  WebhookVerificationQuery,
} from './instagram-webhook.service';

class ConnectIgDto {
  @IsString()
  @MinLength(1)
  username!: string;

  @IsString()
  @MinLength(1)
  password!: string;
}

/**
 * InstagramController
 *  - POST /instagram/connect   — привязка аккаунта через видимый браузер.
 *  - GET  /instagram/webhook   — верификация URL вебхука со стороны Meta.
 *  - POST /instagram/webhook   — приём входящих событий Instagram Direct.
 */
@Controller('instagram')
export class InstagramController {
  constructor(
    private readonly igConnect: IgConnectService,
    private readonly webhooks: InstagramWebhookService,
  ) {}

  @Post('connect')
  connect(@Body() dto: ConnectIgDto) {
    return this.igConnect.connectAccount(dto.username, dto.password);
  }

  @Get('health')
  health() {
    return { ok: true, service: 'instagram-connect' };
  }

  /**
   * Верификация вебхука: Meta присылает GET с hub.mode, hub.verify_token, hub.challenge.
   * Возвращаем hub.challenge (200), если токен совпал; иначе 403.
   */
  @Get('webhook')
  verifyWebhook(@Query() query: WebhookVerificationQuery): string {
    const result = this.webhooks.verify(query);
    if (result.ok) {
      return result.challenge;
    }
    throw new HttpException(
      result.reason === 'mode' ? 'Missing hub.mode=subscribe' : 'Verify token mismatch',
      HttpStatus.FORBIDDEN,
    );
  }

  /**
   * Приём событий от Meta. Всегда отвечаем 200 OK.
   *
   * ВАЖНО: читаем СЫРОЕ тело из `req.body` (Fastify), а НЕ через `@Body()`.
   * Глобальный ValidationPipe в main.ts (whitelist: true) режет JSON-тело вебхука
   * до пустого {}, потому что у этого эндпоинта нет DTO с декораторами.
   * Через @Req() валидатор не трогает тело — мы получаем оригинальный payload от Meta.
   */
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  receiveWebhook(@Req() req: FastifyRequest): Promise<{ status: 'OK' }> {
    return this.webhooks.handleEvent(req.body);
  }
}