import { checkEmailQuality } from './quality.util';

describe('checkEmailQuality', () => {
  it('passes a clean, short email with no flags', () => {
    const result = checkEmailQuality('Quick question', 'Hi Jane, would a short call make sense?', 900);
    expect(result.ok).toBe(true);
    expect(result.flags).toEqual([]);
    expect(result.spamTriggers).toEqual([]);
  });

  it('flags spam triggers (RU and EN) without failing', () => {
    const result = checkEmailQuality('Бесплатно!', 'Act now: 100% guarantee', 900);
    expect(result.ok).toBe(true);
    expect(result.flags).toContain('spam_triggers');
    expect(result.spamTriggers).toEqual(expect.arrayContaining(['бесплатно', 'act now', '100%', 'guarantee']));
  });

  it('flags an over-length body', () => {
    const result = checkEmailQuality('Subject', 'x'.repeat(1000), 900);
    expect(result.flags).toContain('too_long');
  });

  it('fails (not ok) when subject or body is empty', () => {
    expect(checkEmailQuality('', 'body', 900).ok).toBe(false);
    expect(checkEmailQuality('subject', '   ', 900).ok).toBe(false);
  });

  it('flags excessive exclamation and shouting (4+ letter caps, not acronyms)', () => {
    const result = checkEmailQuality('HUGE SALE TODAY', 'LIMITED OFFER NOW!!!', 900);
    expect(result.flags).toContain('excessive_exclamation');
    expect(result.flags).toContain('excessive_caps');
  });

  it('does not flag normal B2B acronyms (CEO, CTO, B2B) as shouting', () => {
    const result = checkEmailQuality('Intro', 'Hi, are you the CEO or CTO handling B2B sales?', 900);
    expect(result.flags).not.toContain('excessive_caps');
  });
});
