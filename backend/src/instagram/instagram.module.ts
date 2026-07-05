import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaModule } from '../prisma.module';
import { AppConfiguration } from '../config/configuration';
import { IgConnectService } from './ig-connect.service';
import { BrowserPoolService } from './browser-pool.service';
import { InstagramAutomationService } from './instagram.service';
import { InstagramController } from './instagram.controller';
import { InstagramWebhookService } from './instagram-webhook.service';

@Module({
  imports: [PrismaModule],
  providers: [
    BrowserPoolService,
    InstagramAutomationService,
    IgConnectService,
    InstagramWebhookService,
    {
      // Разрешать ли эхо-ответ при отсутствии OpenAI (читается из конфига).
      provide: 'WEBHOOK_FALLBACK_ECHO',
      inject: [ConfigService],
      useFactory: (config: ConfigService<AppConfiguration, true>) =>
        config.get('instagram.webhookFallbackEcho', { infer: true }) ?? false,
    },
  ],
  controllers: [InstagramController],
  exports: [InstagramAutomationService],
})
export class InstagramModule {}
