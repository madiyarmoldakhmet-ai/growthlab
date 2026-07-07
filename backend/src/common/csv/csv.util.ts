/**
 * Minimal dependency-free CSV parser shared by contacts and leads import.
 * Handles BOM, comma/semicolon delimiters, and quoted fields with escaped quotes.
 */
export type CsvRecord = Record<string, string>;

export function parseCsv(content: string): CsvRecord[] {
  const rows = readCsvRows(content.replace(/^\uFEFF/, ''));

  if (rows.length < 2) {
    return [];
  }

  const headers = rows[0].map((header) => header.trim());

  return rows.slice(1).map((row) =>
    headers.reduce<CsvRecord>((acc, header, index) => {
      acc[header] = row[index] ?? '';
      return acc;
    }, {}),
  );
}

/**
 * Returns the first non-empty value among the candidate header keys
 * (case-insensitive), e.g. pickField(row, ['email', 'e-mail', 'mail']).
 */
export function pickField(
  row: Record<string, unknown>,
  keys: string[],
): string | undefined {
  const normalizedEntries = new Map(
    Object.entries(row).map(([key, value]) => [key.trim().toLowerCase(), String(value)]),
  );

  for (const key of keys) {
    const value = normalizedEntries.get(key.toLowerCase());

    if (value) {
      return value;
    }
  }

  return undefined;
}

function readCsvRows(content: string): string[][] {
  const rows: string[][] = [];
  const delimiter = detectDelimiter(content);
  let current = '';
  let row: string[] = [];
  let quoted = false;

  for (let index = 0; index < content.length; index += 1) {
    const char = content[index];
    const next = content[index + 1];

    if (char === '"' && quoted && next === '"') {
      current += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      quoted = !quoted;
      continue;
    }

    if (char === delimiter && !quoted) {
      row.push(current);
      current = '';
      continue;
    }

    if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && next === '\n') {
        index += 1;
      }
      row.push(current);
      rows.push(row);
      current = '';
      row = [];
      continue;
    }

    current += char;
  }

  if (current || row.length) {
    row.push(current);
    rows.push(row);
  }

  return rows.filter((cells) => cells.some((cell) => cell.trim()));
}

function detectDelimiter(content: string): ',' | ';' {
  const firstLine = content.split(/\r?\n/, 1)[0] ?? '';
  const commaCount = firstLine.split(',').length;
  const semicolonCount = firstLine.split(';').length;

  return semicolonCount > commaCount ? ';' : ',';
}
