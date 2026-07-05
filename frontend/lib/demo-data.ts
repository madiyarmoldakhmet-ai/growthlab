// ⚠️ DEMO / ПИТЧ-СЦЕНАРИЙ — постановочные данные для презентации инвестору.
// НЕ реальные отправки и НЕ реальные клиенты. Работает только на фронтенде.
// Источник правды для страницы /demo.

import type { StatusKey } from "./statuses";

/* ============================================================
 * 1. БАЗА КОНТАКТОВ — 100 записей
 * ========================================================== */

export interface DemoContact {
  id: number;
  name: string;
  company: string;
  role: string;
  email: string;
  channel: "gmail" | "whatsapp";
  status: StatusKey;
}

const FIRST_NAMES = [
  "Айгерим", "Дмитрий", "Марина", "Ержан", "Ольга", "Санжар", "Алина", "Тимур",
  "Наталья", "Бекзат", "Дария", "Павел", "Жанна", "Рустам", "Камила", "Арман",
  "Светлана", "Игорь", "Айдана", "Максим", "Гульнара", "Виктор", "Лена", "Олег",
  "Динара", "Антон", "Асель", "Кирилл", "Мадина", "Роман",
];

const LAST_NAMES = [
  "Сапарова", "Орлов", "Ким", "Тулегенов", "Беляева", "Абдрахманов", "Жумагулова",
  "Серов", "Петрова", "Мукашев", "Иванова", "Соколов", "Рахимова", "Левин",
  "Нурланова", "Жумабаев", "Кузнецова", "Фролов", "Бекова", "Орлова",
];

const COMPANIES = [
  "KazRetail", "LogiPro", "FinScale", "BuildNova", "MedLink", "AgroTech",
  "EduPrime", "CloudKZ", "MarketIQ", "SteelHub", "FoodChain", "TourFlow",
  "InsurPro", "RealEstate+", "Logistics24", "DevStudio", "EnergyLab", "TexWorld",
  "BeautyNet", "AutoParts",
];

const ROLES = [
  "CEO", "Founder", "COO", "CTO", "Head of Sales", "Marketing Lead",
  "Commercial Director", "Business Development", "VP of Growth", "Head of Ops",
];

const channelFor = (i: number): "gmail" | "whatsapp" => (i % 3 === 0 ? "whatsapp" : "gmail");

const statusFor = (i: number): StatusKey => {
  // первые ~7 — "ответил/заинтересован/качественный" (для наглядности в таблице)
  if (i === 0) return "qualified";
  if (i === 4) return "qualified";
  if (i === 1 || i === 8) return "interested";
  if (i === 2 || i === 5 || i === 9) return "replied";
  if (i >= 87) return "failed"; // ~13% недоставлено
  if (i >= 80) return "sending";
  return "sent";
};

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

export const DEMO_CONTACTS: DemoContact[] = Array.from({ length: 100 }, (_, i) => {
  const name = `${FIRST_NAMES[i % FIRST_NAMES.length]} ${LAST_NAMES[(i * 3) % LAST_NAMES.length]}`;
  const company = COMPANIES[i % COMPANIES.length];
  const role = ROLES[i % ROLES.length];
  const first = slug(FIRST_NAMES[i % FIRST_NAMES.length]);
  const domain = slug(company) + ".kz";
  return {
    id: i + 1,
    name,
    company,
    role,
    email: `${first}.${i + 1}@${domain}`,
    channel: channelFor(i),
    status: statusFor(i),
  };
});

/* ============================================================
 * 2. ЛОГИ СООБЩЕНИЙ — 20 записей с динамическими статусами
 * ========================================================== */

export interface DemoMessageLog {
  id: number;
  channel: "gmail" | "whatsapp";
  to: string;
  subject?: string;
  preview: string;
  status: StatusKey;
}

export const DEMO_MESSAGES: DemoMessageLog[] = Array.from({ length: 20 }, (_, i) => {
  const contact = DEMO_CONTACTS[i];
  const channel = contact.channel;
  return {
    id: i + 1,
    channel,
    to: `${contact.name} · ${contact.company}`,
    subject:
      channel === "gmail"
        ? `Идея по лидам для ${contact.company}`
        : undefined,
    preview:
      channel === "gmail"
        ? `${contact.name.split(" ")[0]}, увидел ваш рост в ${contact.company} — есть способ добавить 20–30 целевых встреч в месяц…`
        : `${contact.name.split(" ")[0]}, добрый день! Коротко: помогаем получать B2B-заявки через персональный outreach…`,
    status: contact.status,
  };
});

/* ============================================================
 * 3. ДИАЛОГИ — 6 сценариев (один с 15+ сообщениями → созвон)
 * ========================================================== */

export interface DemoDialogue {
  id: string;
  title: string;
  channel: "gmail" | "whatsapp";
  outcome: string;
  outcomeStatus: StatusKey;
  isHotLead?: boolean;
  messages: { from: "system" | "contact"; text: string }[];
}

export const DEMO_DIALOGUES: DemoDialogue[] = [
  {
    id: "price",
    title: "Короткий интерес → вопрос цены",
    channel: "whatsapp",
    outcome: "Заинтересован · отправили КП",
    outcomeStatus: "interested",
    messages: [
      { from: "system", text: "Дмитрий, помогаем логистике получать B2B-заявки через персональные письма. Актуально?" },
      { from: "contact", text: "Да, интересно. Сколько стоит?" },
      { from: "system", text: "Базовый пакет — 250 000 ₸/мес: 1000 писем, Email + WhatsApp, дашборд. Скинуть детали?" },
      { from: "contact", text: "Скиньте, гляну." },
    ],
  },
  {
    id: "objection",
    title: "Возражение → сняли сомнение",
    channel: "gmail",
    outcome: "Возражение снято · продолжает диалог",
    outcomeStatus: "replied",
    messages: [
      { from: "system", text: "Марина, можем поднять конверсию из письма в демо за счёт AI-персонализации." },
      { from: "contact", text: "У нас уже была рассылка — почти не отвечали. Чем вы отличаетесь?" },
      { from: "system", text: "Обычно проблема в общих письмах и плохой доставке. Мы греем домены и пишем под конкретную компанию — reply rate 4–7% вместо <1%." },
      { from: "contact", text: "Окей, звучит логично. Покажете пример письма под нас?" },
      { from: "system", text: "Да, пришлю 2 варианта под FinScale сегодня." },
    ],
  },
  {
    id: "not_fit",
    title: "Нецелевой контакт (не лид)",
    channel: "gmail",
    outcome: "Не целевой · в лиды НЕ переводим",
    outcomeStatus: "replied",
    messages: [
      { from: "system", text: "Здравствуйте! Помогаем B2B-командам получать целевые заявки cold-email’ом." },
      { from: "contact", text: "Мы B2C-магазин, продаём физлицам. Нам не подходит." },
      { from: "system", text: "Понял, тогда не отвлекаю. Спасибо за ответ!" },
    ],
  },
  {
    id: "later",
    title: "Просит написать позже",
    channel: "whatsapp",
    outcome: "Follow-up запланирован",
    outcomeStatus: "replied",
    messages: [
      { from: "system", text: "Ержан, добрый день! Можем приводить целевых клиентов письмами. Удобно обсудить?" },
      { from: "contact", text: "Сейчас завал, напишите в начале следующего месяца." },
      { from: "system", text: "Принял, напомню о себе 2-го числа. Хорошего запуска!" },
    ],
  },
  {
    id: "cases",
    title: "Интересуется кейсами",
    channel: "gmail",
    outcome: "Запросил кейсы · греем",
    outcomeStatus: "interested",
    messages: [
      { from: "system", text: "Ольга, помогаем клиникам получать поток заявок на чек-апы и услуги." },
      { from: "contact", text: "А есть результаты? Сколько заявок реально приносите?" },
      { from: "system", text: "На похожем проекте: 1000 писем → 42 ответа → 12 демо → 3 клиента за месяц. Пришлю кейс с цифрами." },
      { from: "contact", text: "Да, интересно посмотреть кейс." },
    ],
  },
  {
    id: "deep_call",
    title: "Глубокий диалог (15+ сообщений) → созвон",
    channel: "whatsapp",
    outcome: "Назначен созвон · КАЧЕСТВЕННЫЙ ЛИД",
    outcomeStatus: "qualified",
    isHotLead: true,
    messages: [
      { from: "system", text: "Айгерим, помогаем рознице добавлять целевые B2B-встречи через персональный cold-email." },
      { from: "contact", text: "Здравствуйте. У нас как раз задача — выйти на поставщиков и сети. Как это работает?" },
      { from: "system", text: "Находим ЛПР, верифицируем контакты, пишем персональные письма и ведём до ответа. Вы получаете готовые встречи." },
      { from: "contact", text: "А базу где берёте? У нас узкая ниша." },
      { from: "system", text: "Собираем под ICP: регион, размер, должность. Под вашу нишу согласуем список перед отправкой." },
      { from: "contact", text: "Сколько встреч в месяц реально?" },
      { from: "system", text: "При 1000 писем — обычно 10–12 демо. Часть закроется в сделки." },
      { from: "contact", text: "А если письма попадут в спам?" },
      { from: "system", text: "Греем домены 2–3 недели, верифицируем адреса — доставляемость ~85%. Это часть услуги." },
      { from: "contact", text: "Кто пишет тексты?" },
      { from: "system", text: "AI готовит черновик под компанию, человек проверяет. Тон и оффер согласуем с вами." },
      { from: "contact", text: "Сколько стоит и что входит?" },
      { from: "system", text: "Стандарт — 250к/мес (1000 писем). Бизнес — 500к (до 3000 писем + WhatsApp). Под старт — Стандарт." },
      { from: "contact", text: "Хорошо. Давайте созвонимся, обсудим детали и базу." },
      { from: "system", text: "Отлично! Завтра в 15:00 (Алматы) удобно? Пришлю ссылку на Zoom." },
      { from: "contact", text: "Да, 15:00 подходит. Жду ссылку." },
      { from: "system", text: "Готово, отправил приглашение. До встречи!" },
    ],
  },
];

/* ============================================================
 * 4. AUTO RESEARCH — 10 итераций (по ТЗ)
 *    Тест 1: 11 ответов / 0 лидов → Тест 10: 45 ответов / 12 лидов / 12.5 млн ₸
 * ========================================================== */

export interface AutoResearchRow {
  test: string;
  improved: string;
  replies: number;
  leads: number;
  sales: number;
  revenue: number;
}

export const AUTO_RESEARCH: AutoResearchRow[] = [
  { test: "Тест 1",  improved: "Старт · базовое письмо",                        replies: 11, leads: 0,  sales: 0, revenue: 0 },
  { test: "Тест 2",  improved: "Короче текст · цифры в теме",                   replies: 15, leads: 2,  sales: 1, revenue: 2_500_000 },
  { test: "Тест 3",  improved: "Кейс в первом касании",                         replies: 19, leads: 3,  sales: 2, revenue: 5_000_000 },
  { test: "Тест 4",  improved: "Один чёткий CTA",                               replies: 23, leads: 5,  sales: 3, revenue: 7_500_000 },
  { test: "Тест 5",  improved: "A/B темы: выгода vs. любопытство",              replies: 27, leads: 6,  sales: 4, revenue: 10_000_000 },
  { test: "Тест 6",  improved: "Убрали клише, добавили конкретику",             replies: 30, leads: 7,  sales: 5, revenue: 12_500_000 },
  { test: "Тест 7",  improved: "Follow-up через 2 дня (авто)",                  replies: 34, leads: 9,  sales: 7, revenue: 17_500_000 },
  { test: "Тест 8",  improved: "Сегментация по отрасли",                        replies: 38, leads: 10, sales: 9, revenue: 22_500_000 },
  { test: "Тест 9",  improved: "Персонализация первой строки (AI)",             replies: 42, leads: 11, sales: 11, revenue: 27_500_000 },
  { test: "Тест 10", improved: "Многошаговая цепочка + WhatsApp-дожим",         replies: 45, leads: 12, sales: 12, revenue: 30_000_000 },
];

/* ============================================================
 * Утилиты
 * ========================================================== */

export const formatTenge = (value: number): string =>
  value === 0 ? "—" : `${value.toLocaleString("ru-RU")} ₸`;

export const formatUsd = (value: number): string =>
  `$${value.toLocaleString("en-US")}`;