import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import puppeteer, { Browser, Page } from 'puppeteer';
import { SendingAccountStatus, SendingPlatform } from '@prisma/client';
import { PrismaService } from '../prisma.service';

export interface IgConnectResult {
  ok: true;
  username: string;
  message: string;
  cookiesCount: number;
}

/**
 * IgConnectService — ручная привязка Instagram-аккаунта через ВИДИМЫЙ браузер.
 *
 * Логика:
 *  1. Запускает Puppeteer в headless: false (видимое окно Chrome).
 *  2. Открывает instagram.com/accounts/login/, вводит username/password.
 *  3. Ждёт 60 секунд — за это время юзер вводит SMS/2FA код в окне.
 *  4. Проверяет URL: если не содержит "login" — вход успешен.
 *  5. Забирает cookies через page.cookies(), сериализует в JSON.
 *  6. Сохраняет в SendingAccount (upsert по identifier) со статусом ACTIVE.
 *  7. Закрывает браузер.
 *
 * Никаких авто-рассылок — только привязка.
 */
@Injectable()
export class IgConnectService {
  private readonly logger = new Logger(IgConnectService.name);
  /** Сколько ждать ввода 2FA-кода пользователем (мс). */
  private readonly MANUAL_LOGIN_WAIT_MS = 60_000;

  constructor(private readonly prisma: PrismaService) {}

  async connectAccount(username: string, password: string): Promise<IgConnectResult> {
    const cleanUsername = username.replace(/^@/, '').trim();
    if (!cleanUsername) throw new BadRequestException('username is required');
    if (!password) throw new BadRequestException('password is required');

    this.logger.log(`[@${cleanUsername}] открываю видимый Chrome для входа в Instagram…`);
    const browser = await this.launchVisibleBrowser();
    try {
      const page = await browser.newPage();
      await this.configurePage(page);

      await page.goto('https://www.instagram.com/accounts/login/', {
        waitUntil: 'networkidle2',
        timeout: 90_000,
      });

      // Заполняем форму логина.
      const userSelectors = [
        'input[name="username"]',
        'input[aria-label*="Phone"]',
        'input[aria-label*="username" i]',
        'input[type="text"]',
      ];
      const passSelectors = ['input[name="password"]', 'input[aria-label*="Password"]', 'input[type="password"]'];
      const userInput = await this.waitForFirst(page, userSelectors, 30_000);
      const passInput = await this.waitForFirst(page, passSelectors, 30_000);
      if (!userInput || !passInput) {
        throw new BadRequestException('Не удалось найти форму входа Instagram на странице.');
      }
      await userInput.click();
      await userInput.type(cleanUsername, { delay: 50 });
      await passInput.click();
      await passInput.type(password, { delay: 50 });

      // Нажимаем "Войти" (нативный click внутри evaluate).
      await page
        .evaluate(() => {
          const buttons = Array.from(document.querySelectorAll('button'));
          const match =
            buttons.find((b) => b.type === 'submit') ??
            buttons.find((b) => /войти|log\s*in|sign\s*in/i.test(b.innerText));
          if (match) (match as HTMLButtonElement).click();
        })
        .catch(() => undefined);

      // Даём пользователю 60 секунд на ввод 2FA/капчи в видимом окне.
      this.logger.log(
        `[@${cleanUsername}] Жду ${this.MANUAL_LOGIN_WAIT_MS / 1000} сек — введите код из SMS/2FA в открывшемся окне Chrome.`,
      );
      await new Promise<void>((resolve) => setTimeout(resolve, this.MANUAL_LOGIN_WAIT_MS));

      const currentUrl = page.url();
      if (/\/accounts\/login/i.test(currentUrl)) {
        throw new BadRequestException(
          `Вход не завершён: страница всё ещё на /login (URL: ${currentUrl}). Проверьте код 2FA и повторите.`,
        );
      }

      // Собираем cookies.
      const cookies = await page.cookies();
      const cookiesJson = JSON.stringify(cookies);
      this.logger.log(`[@${cleanUsername}] получено ${cookies.length} cookies.`);

      // Сохраняем в БД (findFirst + create/update, т.к. нет composite unique).
      const existing = await this.prisma.sendingAccount.findFirst({
        where: { platform: SendingPlatform.INSTAGRAM, identifier: cleanUsername },
        select: { id: true },
      });
      const account = existing
        ? await this.prisma.sendingAccount.update({
            where: { id: existing.id },
            data: { sessionCookies: cookiesJson, status: SendingAccountStatus.ACTIVE },
          })
        : await this.prisma.sendingAccount.create({
            data: {
              platform: SendingPlatform.INSTAGRAM,
              identifier: cleanUsername,
              sessionCookies: cookiesJson,
              status: SendingAccountStatus.ACTIVE,
            },
          });

      this.logger.log(`[@${cleanUsername}] аккаунт привязан и сохранён в SendingAccount (${account.id}).`);

      return {
        ok: true,
        username: cleanUsername,
        message: `Аккаунт @${cleanUsername} успешно привязан! Сохранено ${cookies.length} cookies.`,
        cookiesCount: cookies.length,
      };
    } finally {
      try {
        await browser.close();
      } catch {
        /* ignore */
      }
    }
  }

  private async launchVisibleBrowser(): Promise<Browser> {
    return puppeteer.launch({
      headless: false,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--start-maximized',
      ],
      defaultViewport: null,
    });
  }

  private async configurePage(page: Page): Promise<void> {
    await page.setUserAgent(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    );
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
    });
  }

  private async waitForFirst(
    page: Page,
    selectors: string[],
    timeoutMs: number,
  ): Promise<import('puppeteer').ElementHandle<Element> | null> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      for (const sel of selectors) {
        const handle = await page.$(sel);
        if (handle) return handle;
      }
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    return null;
  }
}