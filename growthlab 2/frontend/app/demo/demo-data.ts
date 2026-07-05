// ⚠️ DEMO / СЦЕНАРИЙ — постановочные данные для презентации.
// Это НЕ реальные отправки и НЕ реальные клиенты. Используется только на /demo.
import type { StatusKey } from "../../lib/statuses";

export const DEMO_FUNNEL = {
  contacts: 100,
  delivered: 87,
  opened: 41,
  replied: 7,
  qualified: 2,
  sales: 1,
  revenue: 2_500_000,
};

export interface DemoContact {
  name: string;
  company: string;
  role: string;
  email: string;
  channel: "email" | "whatsapp";
}

export const SAMPLE_CONTACTS: DemoContact[] = [
  { name: "Айгерим Сапарова", company: "KazRetail", role: "Head of Sales", email: "a.saparova@kazretail.kz", channel: "email" },
  { name: "Дмитрий Орлов", company: "LogiPro", role: "CEO", email: "d.orlov@logipro.kz", channel: "whatsapp" },
  { name: "Марина Ким", company: "FinScale", role: "Marketing Lead", email: "m.kim@finscale.kz", channel: "email" },
  { name: "Ержан Тулегенов", company: "BuildNova", role: "Founder", email: "e.tulegenov@buildnova.kz", channel: "email" },
  { name: "Ольга Беляева", company: "MedLink", role: "COO", email: "o.belyaeva@medlink.kz", channel: "whatsapp" },
  { name: "Санжар Абдрахманов", company: "AgroTech", role: "Commercial Director", email: "s.a@agrotech.kz", channel: "email" },
];

export interface DemoMessage {
  channel: "email" | "whatsapp";
  to: string;
  subject?: string;
  preview: string;
  status: StatusKey;
}

export const SAMPLE_MESSAGES: DemoMessage[] = [
  { channel: "email", to: "Айгерим · KazRetail", subject: "Идея по лидам для KazRetail", preview: "Айгерим, увидел, что вы растёте в рознице — есть способ добавить 20–30 целевых встреч в месяц…", status: "sent" },
  { channel: "whatsapp", to: "Дмитрий · LogiPro", preview: "Дмитрий, добрый день! Коротко: помогаем логистике получать B2B-заявки через персональный cold-email…", status: "replied" },
  { channel: "email", to: "Марина · FinScale", subject: "Быстрый вопрос по воронке FinScale", preview: "Марина, пара мыслей, как поднять конверсию из письма в демо…", status: "sent" },
  { channel: "email", to: "Ержан · BuildNova", subject: "Лиды для BuildNova без рекламы", preview: "Ержан, здравствуйте! Можем приводить целевых клиентов письмами…", status: "queued" },
  { channel: "whatsapp", to: "Ольга · MedLink", preview: "Ольга, добрый день! По поводу заявок для клиники…", status: "interested" },
  { channel: "email", to: "Санжар · AgroTech", subject: "AgroTech × новые B2B-контакты", preview: "Санжар, есть идея по выходу на агродистрибьюторов…", status: "failed" },
];

export type DialogueKind = "price" | "objection" | "not_fit" | "later" | "cases" | "deep_call";

export interface DemoDialogue {
  id: string;
  title: string;
  channel: "email" | "whatsapp";
  kind: DialogueKind;
  outcome: string;
  outcomeStatus: StatusKey;
  messages: { from: "us" | "them"; text: string }[];
}

export const DIALOGUES: DemoDialogue[] = [
  {
    id: "price",
    title: "Короткий интерес + вопрос по цене",
    channel: "whatsapp",
    kind: "price",
    outcome: "Заинтересован · отправили цену",
    outcomeStatus: "interested",
    messages: [
      { from: "us", text: "Дмитрий, помогаем логистике получать B2B-заявки через персональные письма. Актуально?" },
      { from: "them", text: "Да, интересно. Сколько стоит?" },
      { from: "us", text: "Базовый пакет — 250 000 ₸/мес: 1000 писем, Email + Telegram, дашборд. Скинуть детали?" },
      { from: "them", text: "Скиньте, гляну." },
    ],
  },
  {
    id: "objection",
    title: "Сомнение + ответ на возражение",
    channel: "email",
    kind: "objection",
    outcome: "Возражение снято · продолжает диалог",
    outcomeStatus: "replied",
    messages: [
      { from: "us", text: "Марина, можем поднять конверсию из письма в демо за счёт персонализации через AI." },
      { from: "them", text: "У нас уже была рассылка — почти не отвечали. Чем вы отличаетесь?" },
      { from: "us", text: "Обычно проблема в общих письмах и плохой доставке. Мы греем домены и пишем под конкретную компанию — reply rate выходит 4–7% вместо <1%." },
      { from: "them", text: "Окей, звучит логично. Покажете пример письма под нас?" },
      { from: "us", text: "Да, пришлю 2 варианта под FinScale сегодня." },
    ],
  },
  {
    id: "not_fit",
    title: "Неподходящий контакт (не становится лидом)",
    channel: "email",
    kind: "not_fit",
    outcome: "Не целевой · в лиды НЕ переводим",
    outcomeStatus: "replied",
    messages: [
      { from: "us", text: "Здравствуйте! Помогаем B2B-командам получать целевые заявки cold-email’ом." },
      { from: "them", text: "Мы B2C-магазин, продаём físным лицам. Нам не подходит." },
      { from: "us", text: "Понял, тогда не отвлекаю. Спасибо за ответ!" },
    ],
  },
  {
    id: "later",
    title: "Просит написать позже",
    channel: "whatsapp",
    kind: "later",
    outcome: "Follow-up запланирован на через 3 недели",
    outcomeStatus: "replied",
    messages: [
      { from: "us", text: "Ержан, добрый день! Можем приводить целевых клиентов письмами. Удобно обсудить?" },
      { from: "them", text: "Сейчас завал, напишите в начале следующего месяца." },
      { from: "us", text: "Принял, напомню о себе 2-го числа. Хорошего запуска!" },
    ],
  },
  {
    id: "cases",
    title: "Интересуется кейсами / результатом",
    channel: "email",
    kind: "cases",
    outcome: "Запросил кейсы · греем",
    outcomeStatus: "interested",
    messages: [
      { from: "us", text: "Ольга, помогаем клиникам получать поток заявок на чек-апы и услуги." },
      { from: "them", text: "А есть результаты? Сколько заявок реально приносите?" },
      { from: "us", text: "На похожем проекте: 1000 писем → 42 ответа → 12 демо → 3 клиента за месяц. Пришлю кейс с цифрами." },
      { from: "them", text: "Да, интересно посмотреть кейс." },
    ],
  },
  {
    id: "deep_call",
    title: "Сильный диалог (15+ сообщений) → переходит в созвон",
    channel: "whatsapp",
    kind: "deep_call",
    outcome: "Назначен созвон · качественный лид",
    outcomeStatus: "qualified",
    messages: [
      { from: "us", text: "Айгерим, помогаем рознице добавлять целевые B2B-встречи через персональный cold-email." },
      { from: "them", text: "Здравствуйте. У нас как раз задача — выйти на поставщиков и сети. Как это работает?" },
      { from: "us", text: "Находим лиц, принимающих решения, верифицируем контакты, пишем персональные письма и ведём до ответа. Вы получаете готовые встречи." },
      { from: "them", text: "А базу где берёте? У нас узкая ниша." },
      { from: "us", text: "Собираем под ICP: регион, размер, должность. Под вашу нишу соберём список и согласуем перед отправкой." },
      { from: "them", text: "Сколько встреч в месяц реально?" },
      { from: "us", text: "При 1000 писем — обычно 10–12 демо. Часть закроется в сделки." },
      { from: "them", text: "А если письма попадут в спам?" },
      { from: "us", text: "Греем домены и ящики 2–3 недели, верифицируем адреса — доставляемость ~85%. Это часть услуги." },
      { from: "them", text: "Кто пишет тексты?" },
      { from: "us", text: "AI готовит черновик под компанию, человек проверяет. Тон и оффер согласуем с вами." },
      { from: "them", text: "Сколько стоит и что входит?" },
      { from: "us", text: "Стандарт — 250к/мес (1000 писем, Email+Telegram). Бизнес — 500к (плюс WhatsApp, до 3000). Под вас, думаю, Стандарт на старт." },
      { from: "them", text: "Хорошо. Давайте созвонимся, обсудим детали и базу." },
      { from: "us", text: "Отлично! Завтра в 15:00 по Алматы удобно? Пришлю ссылку на Zoom." },
      { from: "them", text: "Да, 15:00 подходит. Жду ссылку." },
      { from: "us", text: "Готово, отправил приглашение. До встречи!" },
    ],
  },
];

export interface HandoffLead {
  name: string;
  company: string;
  reason: string;
}

export const HANDOFF_LEADS: HandoffLead[] = [
  { name: "Айгерим Сапарова", company: "KazRetail", reason: "Назначен созвон, бюджет есть, ЛПР" },
  { name: "Ольга Беляева", company: "MedLink", reason: "Запросила кейсы, активно отвечает" },
];

export interface AutoResearchRow {
  test: string;
  improved: string;
  replies: number;
  qualified: number;
  sales: number;
  revenue: number;
}

export const AUTO_RESEARCH: AutoResearchRow[] = [
  { test: "Тест 1 — базовое письмо", improved: "старт (точка отсчёта)", replies: 4, qualified: 1, sales: 0, revenue: 0 },
  { test: "Тест 2 — короче + цифры в теме", improved: "тема письма, один чёткий CTA", replies: 7, qualified: 2, sales: 1, revenue: 2_500_000 },
  { test: "Тест 3 — кейс в первом письме", improved: "соц.доказательство в 1-м касании", replies: 11, qualified: 4, sales: 2, revenue: 5_000_000 },
];

export const formatTenge = (value: number): string =>
  value === 0 ? "—" : `${value.toLocaleString("ru-RU")} ₸`;
