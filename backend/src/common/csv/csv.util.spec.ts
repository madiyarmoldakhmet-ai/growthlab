import { parseCsv, pickField } from './csv.util';

describe('parseCsv', () => {
  it('parses comma-delimited rows into header-keyed records', () => {
    const records = parseCsv('email,name\na@x.com,Alice\nb@x.com,Bob');
    expect(records).toEqual([
      { email: 'a@x.com', name: 'Alice' },
      { email: 'b@x.com', name: 'Bob' },
    ]);
  });

  it('auto-detects the semicolon delimiter', () => {
    const records = parseCsv('email;company\na@x.com;Acme');
    expect(records[0]).toEqual({ email: 'a@x.com', company: 'Acme' });
  });

  it('handles a UTF-8 BOM and quoted fields with embedded delimiters', () => {
    const records = parseCsv('﻿email,note\n"a@x.com","hello, world"');
    expect(records[0]).toEqual({ email: 'a@x.com', note: 'hello, world' });
  });

  it('returns an empty array when there is only a header', () => {
    expect(parseCsv('email,name')).toEqual([]);
  });
});

describe('pickField', () => {
  it('matches header keys case-insensitively across aliases', () => {
    const row = { 'E-Mail': 'a@x.com', Title: 'CEO' };
    expect(pickField(row, ['email', 'e-mail'])).toBe('a@x.com');
    expect(pickField(row, ['position', 'title'])).toBe('CEO');
  });

  it('returns undefined when no key matches a non-empty value', () => {
    expect(pickField({ email: '' }, ['email'])).toBeUndefined();
    expect(pickField({}, ['phone'])).toBeUndefined();
  });
});
