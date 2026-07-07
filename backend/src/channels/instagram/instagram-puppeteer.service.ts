import { Injectable, Logger } from '@nestjs/common';
import puppeteer, {
  Browser,
  CookieParam,
  ElementHandle,
  Page,
} from 'puppeteer';

export type RawCookies = string | Record<string, unknown> | Array<unknown>;

export interface IgSendResult {
  ok: true;
  targetUsername: string;
  fromUsername?: string;
  sentAt: string;
  note?: string;
}

/**
 * InstagramAutomationService — одиночная отправка DM через Puppeteer.
 *
 * Массовая рассылка ОТКЛЮЧЕНА. Этот сервис используется только для ручной
 * отправки из UI через /clean-mvp/send-instagram. Аккаунты привязываются
 * вручную через IgConnectService (видимый браузер, 2FA).
 */
@Injectable()
export class InstagramAutomationService {
  private readonly logger = new Logger(InstagramAutomationService.name);

  async sendDirectMessage(
    username: string,
    targetUsername: string,
    text: string,
    cookies: RawCookies,
  ): Promise<IgSendResult> {
    const cleanTarget = targetUsername.replace(/^@/, '').trim();
    if (!cleanTarget) throw new Error('targetUsername is required');
    if (!text.trim()) throw new Error('text is required');

    const parsedCookies = this.normalizeCookies(cookies);
    if (parsedCookies.length === 0) {
      throw new Error('No valid cookies provided');
    }

    this.logger.log(`[${username}] -> [@${cleanTarget}] starting send at ${new Date().toISOString()}`);

    const browser = await this.launchBrowser();
    try {
      const page = await browser.newPage();
      await this.configurePage(page);
      await this.setCookies(page, parsedCookies, username);
      await this.sendViaPage(page, cleanTarget, text, username);
      return {
        ok: true,
        targetUsername: cleanTarget,
        fromUsername: username,
        sentAt: new Date().toISOString(),
        note: 'Sent via standalone Puppeteer browser.',
      };
    } finally {
      await this.safeClose(browser);
    }
  }

  private async sendViaPage(page: Page, target: string, text: string, fromUsername: string): Promise<void> {
    await page.goto('https://www.instagram.com/direct/new/', {
      waitUntil: 'networkidle2',
      timeout: 90000,
    });
    if (page.url().includes('/accounts/login')) {
      throw new Error(`Сессия @${fromUsername} невалидна (редирект на /login).`);
    }
    await this.searchRecipient(page, target, fromUsername);
    await this.pickFirstResult(page, target, fromUsername);
    await this.openConversationComposer(page, fromUsername);
    await this.typeAndSend(page, text, fromUsername);
  }

  private async launchBrowser(): Promise<Browser> {
    return puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled', '--disable-dev-shm-usage'],
    });
  }

  private async configurePage(page: Page): Promise<void> {
    await page.setViewport({ width: 1280, height: 900 });
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
    });
  }

  private async safeClose(browser: Browser): Promise<void> {
    try { await browser.close(); } catch { /* ignore */ }
  }

  private normalizeCookies(raw: RawCookies): CookieParam[] {
    let data: unknown = raw;
    if (typeof raw === 'string') {
      try { data = JSON.parse(raw); } catch { throw new Error('sessionCookies is not valid JSON'); }
    }
    let list: unknown;
    if (Array.isArray(data)) list = data;
    else if (data && typeof data === 'object' && Array.isArray((data as any).cookies)) list = (data as any).cookies;
    else list = [];
    return (list as Array<Record<string, unknown>>)
      .filter((c) => c && typeof c === 'object' && typeof c.name === 'string')
      .map<CookieParam>((c) => {
        const cookie: CookieParam = {
          name: String(c.name),
          value: String(c.value ?? ''),
          domain: typeof c.domain === 'string' ? c.domain : '.instagram.com',
          path: typeof c.path === 'string' ? c.path : '/',
          httpOnly: Boolean(c.httpOnly),
          secure: c.secure === undefined ? true : Boolean(c.secure),
        };
        if (typeof c.expires === 'number') cookie.expires = c.expires;
        if (typeof c.sameSite === 'string') cookie.sameSite = this.coerceSameSite(c.sameSite);
        return cookie;
      });
  }

  private coerceSameSite(value: string): 'Strict' | 'Lax' | 'None' {
    const v = value.toLowerCase();
    if (v === 'strict') return 'Strict';
    if (v === 'none') return 'None';
    return 'Lax';
  }

  private async setCookies(page: Page, cookies: CookieParam[], username: string): Promise<void> {
    await page.goto('https://www.instagram.com/', { waitUntil: 'domcontentloaded', timeout: 60000 });
    for (const cookie of cookies) await page.setCookie(cookie);
  }

  private async searchRecipient(page: Page, target: string, username: string): Promise<void> {
    const selectors = ['input[placeholder*="Поиск"]', 'input[placeholder*="Search"]', 'input[aria-label*="Search"]', 'input[placeholder*="search" i]', 'div[role="dialog"] input[type="text"]', 'input[type="text"]'];
    const input = await this.waitForFirst(page, selectors, 30000);
    if (!input) throw new Error('Не найдено поле поиска получателя на /direct/new');
    await input.click();
    await page.keyboard.down('Control'); await page.keyboard.press('A'); await page.keyboard.up('Control');
    await page.keyboard.press('Backspace');
    await input.type(target, { delay: 60 });
    await this.delay(1500);
  }

  private async pickFirstResult(page: Page, target: string, username: string): Promise<void> {
    const selectors = ['div[role="dialog"] div[role="button"]', 'div[role="dialog"] li[role="presentation"] a', 'div[role="dialog"] a[href*="/"]', 'div[role="dialog"] [role="button"]'];
    const first = await this.waitForFirst(page, selectors, 20000);
    if (!first) throw new Error(`Нет результатов для "@${target}"`);
    await first.click();
    await this.delay(800);
  }

  private async openConversationComposer(page: Page, username: string): Promise<void> {
    const composerSelectors = ['textarea[placeholder*="Сообщение"]', 'textarea[placeholder*="Message"]', 'div[contenteditable="true"][role="textbox"]', 'textarea'];
    const composer = await this.waitForFirst(page, composerSelectors, 30000);
    if (!composer) throw new Error('Поле ввода сообщения не появилось');
  }

  private async typeAndSend(page: Page, text: string, username: string): Promise<void> {
    const composer = await this.getFirst(page, ['textarea[placeholder*="Сообщение"]', 'textarea[placeholder*="Message"]', 'div[contenteditable="true"][role="textbox"]', 'textarea']);
    if (!composer) throw new Error('Композер сообщения не найден');
    await composer.focus();
    await composer.type(text, { delay: 25 });
    await this.delay(400);
    await page.keyboard.press('Enter');
    await this.delay(1500);
  }

  private async waitForFirst(page: Page, selectors: string[], timeoutMs: number): Promise<ElementHandle<Element> | null> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      for (const sel of selectors) {
        const handle = await page.$(sel);
        if (handle) return handle;
      }
      await this.delay(250);
    }
    return null;
  }

  private async getFirst(page: Page, selectors: string[]): Promise<ElementHandle<Element> | null> {
    for (const sel of selectors) {
      const handle = await page.$(sel);
      if (handle) return handle;
    }
    return null;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}