// 🟡 МОК-данные MVP. Это НЕ реальные данные и НЕ реальная отправка.
// Заменяется на реальные API-вызовы (см. lib/api.ts) без изменения экранов.
import type {
  AutoResearchInsight,
  Campaign,
  Contact,
  Dialogue,
  Lead,
  MessageVersion,
  Offer,
  QueueItem,
  Sale,
} from "./types";

export const MOCK_CAMPAIGNS: Campaign[] = [
  { id: "c1", name: "KazRetail — выход на сети", goal: "Встречи с байерами сетей", channel: "email", status: "active", sent: 870, replied: 42, qualified: 8 },
  { id: "c2", name: "LogiPro — B2B логистика", goal: "Заявки на тариф", channel: "whatsapp", status: "active", sent: 240, replied: 19, qualified: 4 },
  { id: "c3", name: "FinScale — демо продукта", goal: "Демо-звонки", channel: "multi", status: "paused", sent: 410, replied: 12, qualified: 2 },
  { id: "c4", name: "MedLink — чек-апы", goal: "Заявки клиник", channel: "email", status: "draft", sent: 0, replied: 0, qualified: 0 },
];

export const MOCK_CONTACTS: Contact[] = [
  { id: "k1", name: "Айгерим Сапарова", company: "KazRetail", role: "Head of Sales", email: "a.saparova@kazretail.kz", phone: "+7 701 000 11 22", whatsapp: "+7 701 000 11 22", status: "qualified", quality: "ЛПР, назначен созвон" },
  { id: "k2", name: "Дмитрий Орлов", company: "LogiPro", role: "CEO", email: "d.orlov@logipro.kz", whatsapp: "+7 701 222 33 44", status: "interested", quality: "Спросил цену" },
  { id: "k3", name: "Марина Ким", company: "FinScale", role: "Marketing Lead", email: "m.kim@finscale.kz", status: "replied", quality: "Возражение снято" },
  { id: "k4", name: "Ержан Тулегенов", company: "BuildNova", role: "Founder", email: "e.tulegenov@buildnova.kz", status: "sent", quality: "Письмо доставлено" },
  { id: "k5", name: "Ольга Беляева", company: "MedLink", role: "COO", email: "o.belyaeva@medlink.kz", whatsapp: "+7 705 555 66 77", status: "interested", quality: "Запросила кейсы" },
  { id: "k6", name: "Санжар Абдрахманов", company: "AgroTech", role: "Commercial Dir.", email: "s.a@agrotech.kz", status: "failed", quality: "Адрес не существует (hard bounce)" },
  { id: "k7", name: "Дина Нурланова", company: "EduPlus", role: "Ops Manager", email: "d.n@eduplus.kz", status: "queued", quality: "В очереди на отправку" },
];

export const MOCK_OFFERS: Offer[] = [
  {
    id: "o1",
    product: "GrowLab — cold-email с AI-персонализацией",
    audience: "B2B-компании в Казахстане и России (МСБ, 10–100 чел.)",
    price: "от 250 000 ₸/мес (Стандарт)",
    benefit: "Целевые встречи без рекламы: 1000 писем → ~12 демо → 2–3 клиента",
    nextStep: "Короткий созвон 15 минут — покажем пример писем под вашу нишу",
  },
];

export const MOCK_MESSAGES: MessageVersion[] = [
  {
    id: "m1",
    channel: "email",
    name: "KazRetail — первое касание",
    version: "v2",
    subject: "Идея по лидам для KazRetail",
    body: "Айгерим, здравствуйте! Увидел, что вы растёте в рознице. Помогаем таким командам добавлять 20–30 целевых встреч в месяц через персональные письма. Покажу пример под вашу нишу — удобно созвониться на 15 минут?",
  },
  {
    id: "m2",
    channel: "whatsapp",
    name: "LogiPro — WhatsApp касание",
    version: "v1",
    body: "Дмитрий, добрый день! Помогаем логистике получать B2B-заявки через персональный cold-email. Актуально обсудить?",
  },
  {
    id: "m3",
    channel: "email",
    name: "Follow-up #1 (нет ответа)",
    version: "v1",
    subject: "Поднимаю предыдущее письмо",
    body: "Марина, возможно, письмо затерялось. Если интересно поднять конверсию из письма в демо — пришлю 2 примера под FinScale. Ок?",
  },
];

export const MOCK_QUEUE: QueueItem[] = [
  { id: "q1", to: "Дина Нурланова", company: "EduPlus", channel: "email", status: "queued" },
  { id: "q2", to: "Ержан Тулегенов", company: "BuildNova", channel: "email", status: "sending" },
  { id: "q3", to: "Айгерим Сапарова", company: "KazRetail", channel: "email", status: "sent" },
  { id: "q4", to: "Санжар Абдрахманов", company: "AgroTech", channel: "email", status: "failed", error: "Адрес не существует — письмо вернулось (hard bounce). Контакт исключён из рассылки." },
  { id: "q5", to: "Гульнара О.", company: "RetailX", channel: "whatsapp", status: "failed", error: "WhatsApp: нужен одобренный шаблон — обычный текст вне 24-часового окна не доставляется." },
];

export const MOCK_DIALOGUES: Dialogue[] = [
  {
    id: "d1",
    contact: "Дмитрий Орлов",
    company: "LogiPro",
    channel: "whatsapp",
    status: "interested",
    lastAt: "сегодня, 11:20",
    messages: [
      { from: "us", text: "Дмитрий, помогаем логистике получать B2B-заявки. Актуально?" },
      { from: "them", text: "Да, интересно. Сколько стоит?" },
      { from: "us", text: "Стандарт — 250 000 ₸/мес. Скинуть детали?" },
      { from: "them", text: "Скиньте, гляну." },
    ],
  },
  {
    id: "d2",
    contact: "Марина Ким",
    company: "FinScale",
    channel: "email",
    status: "replied",
    lastAt: "вчера, 17:05",
    messages: [
      { from: "us", text: "Марина, поможем поднять конверсию из письма в демо." },
      { from: "them", text: "Была рассылка — почти не отвечали. Чем отличаетесь?" },
      { from: "us", text: "Греем домены и пишем под компанию — reply rate 4–7%. Прислать пример?" },
      { from: "them", text: "Да, покажите." },
    ],
  },
  {
    id: "d3",
    contact: "Ольга Беляева",
    company: "MedLink",
    channel: "whatsapp",
    status: "interested",
    lastAt: "вчера, 09:40",
    messages: [
      { from: "us", text: "Ольга, помогаем клиникам получать заявки на чек-апы." },
      { from: "them", text: "А есть результаты?" },
      { from: "us", text: "1000 писем → 12 демо → 3 клиента. Пришлю кейс." },
    ],
  },
];

export const MOCK_LEADS: Lead[] = [
  { id: "l1", name: "Айгерим Сапарова", company: "KazRetail", status: "qualified", reasons: ["ЛПР (Head of Sales)", "Назначен созвон", "Бюджет есть", "15+ сообщений в диалоге"] },
  { id: "l2", name: "Ольга Беляева", company: "MedLink", status: "interested", reasons: ["Активно отвечает", "Запросила кейсы"] },
  { id: "l3", name: "Дмитрий Орлов", company: "LogiPro", status: "interested", reasons: ["Спросил цену", "Готов смотреть детали"] },
];

export const MOCK_SALES: Sale[] = [
  { id: "s1", company: "KazRetail", stage: "закрыто", amount: 2_500_000, note: "Стандарт, оплата за 3 мес вперёд" },
  { id: "s2", company: "MedLink", stage: "созвон", amount: 0, note: "Созвон завтра 15:00" },
  { id: "s3", company: "LogiPro", stage: "follow-up", amount: 0, note: "Отправлено КП, ждём решение" },
];

export const MOCK_AUTO_RESEARCH: AutoResearchInsight = {
  worked: [
    "Короткая тема с цифрой — open rate +12%",
    "Один чёткий CTA вместо двух — reply rate +3 п.п.",
    "Кейс в первом письме — больше квал.лидов",
  ],
  failed: [
    "Длинное вступление про компанию — читают хуже",
    "Отправка в пятницу вечером — мало ответов",
  ],
  improve: [
    "Добавить соц.доказательство в 1-е касание",
    "Тестировать отправку утром вторник–четверг",
  ],
  proposal: {
    current: "Здравствуйте! Мы — GrowLab, помогаем с лидогенерацией. Хотели бы рассказать о нашем сервисе и обсудить сотрудничество.",
    next: "Айгерим, увидел рост KazRetail в рознице. На похожем проекте дали 12 демо за месяц. Покажу пример писем под вашу нишу — 15 минут в четверг?",
  },
};

export const formatTenge = (value: number): string =>
  value === 0 ? "—" : `${value.toLocaleString("ru-RU")} ₸`;
