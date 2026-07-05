import { Injectable, Logger } from '@nestjs/common';

/**
 * BrowserPoolService (ЗАГЛУШКА — авто-рассылка ОТКЛЮЧЕНА).
 *
 * Раньше поднимал 2 headless Chromium и запускал массовую рассылку при старте
 * бэкенда. Сейчас все авто-воркеры выключены — IG-аккаунты привязываются
 * вручную через видимый браузер (см. IgConnectService).
 *
 * Методы acquireSession/getActiveCount оставлены, чтобы не ломать DI.
 */
@Injectable()
export class BrowserPoolService {
  private readonly logger = new Logger(BrowserPoolService.name);

  acquireSession(): { username: string; page: import('puppeteer').Page; ready: boolean } {
    throw new Error(
      'BrowserPool отключён. Привяжите Instagram-аккаунт вручную через /instagram/connect.',
    );
  }

  getActiveCount(): number {
    return 0;
  }
}