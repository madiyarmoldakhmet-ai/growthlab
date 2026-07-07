import { Module } from '@nestjs/common';
import { InstagramAutomationService } from './instagram-puppeteer.service';

/**
 * InstagramModule — адаптер отправки DM через Puppeteer.
 *
 * Перенесён из корневого `backend/` (Clean MVP), где это была единственная
 * рабочая реализация Instagram-отправки. Здесь оставлена только независимая
 * логика одиночной отправки (`InstagramAutomationService`).
 *
 * Связанные части (login через видимый браузер, Meta webhook inbound,
 * browser-pool для массовой рассылки) будут добавлены на Фазе 7 плана,
 * когда появится таблица `sending_accounts` и единый `ChannelAdapter`.
 *
 * ВАЖНО: массовая рассылка через Puppeteer намеренно ОТКЛЮЧЕНА —
 * используется только для ручной/single отправки.
 */
@Module({
  providers: [InstagramAutomationService],
  exports: [InstagramAutomationService],
})
export class InstagramModule {}
