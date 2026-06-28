/**
 * Lightweight spam/quality heuristics for generated cold emails.
 * Soft signals (spam words, length, shouting) are recorded as flags; hard signals
 * (empty subject/body) make the result not-ok so the caller can reject/regenerate.
 */
const SPAM_TRIGGERS = [
  // RU
  'бесплатно',
  'гарантия',
  'гарантируем',
  'только сегодня',
  'срочно',
  'успей',
  'акция',
  'скидка',
  'розыгрыш',
  'выиграй',
  'кредит',
  'без вложений',
  'заработок',
  // EN
  'free',
  'guarantee',
  'act now',
  'limited time',
  'click here',
  'buy now',
  'risk-free',
  'winner',
  'cash',
  '100%',
];

export interface QualityResult {
  ok: boolean;
  flags: string[];
  spamTriggers: string[];
}

export function checkEmailQuality(
  subject: string | undefined,
  body: string | undefined,
  maxBodyLength: number,
): QualityResult {
  const flags: string[] = [];
  const subjectText = (subject ?? '').trim();
  const bodyText = (body ?? '').trim();

  if (!subjectText) flags.push('empty_subject');
  if (!bodyText) flags.push('empty_body');

  if (bodyText.length > maxBodyLength) flags.push('too_long');

  const haystack = `${subjectText}\n${bodyText}`.toLowerCase();
  const spamTriggers = SPAM_TRIGGERS.filter((word) => haystack.includes(word));
  if (spamTriggers.length > 0) flags.push('spam_triggers');

  const exclamations = (haystack.match(/!/g) ?? []).length;
  if (exclamations >= 3) flags.push('excessive_exclamation');

  const shoutyWords = (`${subjectText} ${bodyText}`.match(/\b[A-ZА-ЯЁ]{4,}\b/g) ?? []).length;
  if (shoutyWords >= 3) flags.push('excessive_caps');

  // Hard failures only: an email with no subject or no body must not be sent.
  const ok = !flags.includes('empty_subject') && !flags.includes('empty_body');

  return { ok, flags, spamTriggers };
}
