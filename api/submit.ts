import type { VercelRequest, VercelResponse } from '@vercel/node';

const MAX_BODY_BYTES = 100 * 1024;
const MAX_VALUE_LENGTH = 5000;
const MAX_COLUMN_LENGTH = 200;
const MAX_PAIRS = 500;

const BASE_HEADERS = ['№ анкеты', 'Дата и время', 'Язык анкеты', 'Время заполнения, мин'];

/** Простое ограничение частоты по IP (в памяти одного инстанса). */
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX = 20;
const hits = new Map<string, number[]>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((time) => now - time < RATE_LIMIT_WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) {
    for (const [key, times] of hits) {
      if (times.every((time) => now - time >= RATE_LIMIT_WINDOW_MS)) hits.delete(key);
    }
  }
  return recent.length > RATE_LIMIT_MAX;
}

function clientIp(req: VercelRequest): string {
  const forwarded = req.headers['x-forwarded-for'];
  const value = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  return (value?.split(',')[0] ?? req.socket.remoteAddress ?? 'unknown').trim();
}

/** Защита от формул: значения, начинающиеся с = + - @, экранируются апострофом. */
function sanitize(value: unknown): string {
  const text = value == null ? '' : String(value).slice(0, MAX_VALUE_LENGTH);
  return /^[=+\-@]/.test(text) ? `'${text}` : text;
}

function quoteSheet(name: string): string {
  return `'${name.replace(/'/g, "''")}'`;
}

function bishkekTimestamp(date: Date): string {
  const parts = new Intl.DateTimeFormat('ru-RU', {
    timeZone: 'Asia/Bishkek',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? '';
  return `${get('day')}.${get('month')}.${get('year')} ${get('hour')}:${get('minute')}`;
}

type Pair = [string, string];

function parsePairs(input: unknown): Pair[] | null {
  if (!Array.isArray(input) || input.length === 0 || input.length > MAX_PAIRS) return null;
  const pairs: Pair[] = [];
  for (const entry of input) {
    if (!Array.isArray(entry) || entry.length !== 2) return null;
    const [column, value] = entry;
    if (typeof column !== 'string' || !column.trim() || column.length > MAX_COLUMN_LENGTH) {
      return null;
    }
    if (value != null && typeof value !== 'string' && typeof value !== 'number') return null;
    pairs.push([column, sanitize(value)]);
  }
  return pairs;
}

/** googleapis загружается только для варианта с сервисным аккаунтом. */
async function sheetsClient() {
  const { google } = await import('googleapis');
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  if (!email || !key) throw new Error('missing credentials');
  const auth = new google.auth.JWT({
    email,
    key,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  return google.sheets({ version: 'v4', auth });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }

  const declaredLength = Number(req.headers['content-length'] ?? 0);
  if (declaredLength > MAX_BODY_BYTES) {
    return res.status(413).json({ ok: false, error: 'too_large' });
  }

  if (rateLimited(clientIp(req))) {
    return res.status(429).json({ ok: false, error: 'too_many_requests' });
  }

  const body = (typeof req.body === 'string' ? safeParse(req.body) : req.body) as
    | Record<string, unknown>
    | null;
  if (!body || typeof body !== 'object') {
    return res.status(400).json({ ok: false, error: 'bad_request' });
  }

  // Поле-ловушка: заполняют только боты. Отвечаем успехом, но ничего не пишем.
  if (typeof body.company === 'string' && body.company.trim() !== '') {
    return res.status(200).json({ ok: true, number: '' });
  }

  if (JSON.stringify(body).length > MAX_BODY_BYTES) {
    return res.status(413).json({ ok: false, error: 'too_large' });
  }

  const lang = body.lang === 'ky' ? 'ky' : 'ru';
  const durationRaw = Number(body.durationMin);
  const durationMin = Number.isFinite(durationRaw)
    ? String(Math.min(600, Math.max(0, Math.round(durationRaw))))
    : '';

  const pairs = parsePairs(body.answers);
  if (!pairs) return res.status(400).json({ ok: false, error: 'bad_request' });

  // Вариант без Google Cloud: запись делает веб-приложение Apps Script,
  // привязанное к самой таблице (см. apps-script/Submit.gs).
  const appsScriptUrl = process.env.APPS_SCRIPT_URL;
  if (appsScriptUrl) {
    try {
      const upstream = await fetch(appsScriptUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lang,
          durationMin,
          answers: pairs,
          secret: process.env.APPS_SCRIPT_SECRET ?? '',
        }),
        redirect: 'follow',
      });
      // при ошибке доступа Apps Script отвечает html-страницей, а не json
      const text = await upstream.text();
      const data = safeParse(text) as { ok?: boolean; number?: string } | null;
      if (!upstream.ok || !data?.ok) {
        throw new Error(`apps script ${upstream.status}: ${text.slice(0, 200)}`);
      }
      return res.status(200).json({ ok: true, number: data.number ?? '' });
    } catch (error) {
      console.error('submit failed:', error instanceof Error ? error.message : 'unknown error');
      return res.status(500).json({ ok: false, error: 'server_error' });
    }
  }

  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  const sheetName = process.env.SHEET_NAME || 'Ответы';
  if (!spreadsheetId) {
    console.error('submit: GOOGLE_SHEET_ID is not set');
    return res.status(500).json({ ok: false, error: 'server_error' });
  }

  try {
    const sheets = await sheetsClient();
    const range = quoteSheet(sheetName);

    // 1. Лист: создаём, если его ещё нет
    const meta = await sheets.spreadsheets.get({
      spreadsheetId,
      fields: 'sheets.properties.title',
    });
    const exists = meta.data.sheets?.some((sheet) => sheet.properties?.title === sheetName);
    if (!exists) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: { requests: [{ addSheet: { properties: { title: sheetName } } }] },
      });
    }

    // 2. Шапка: создаём или дописываем новые столбцы в конец
    const headerResponse = exists
      ? await sheets.spreadsheets.values.get({ spreadsheetId, range: `${range}!1:1` })
      : null;
    const existing = (headerResponse?.data.values?.[0] ?? []).map(String).filter(Boolean);
    const headers = existing.length ? [...existing] : [...BASE_HEADERS];
    let headersChanged = existing.length === 0;
    for (const [column] of pairs) {
      if (!headers.includes(column)) {
        headers.push(column);
        headersChanged = true;
      }
    }
    if (headersChanged) {
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${range}!A1`,
        valueInputOption: 'RAW',
        requestBody: { values: [headers] },
      });
    }

    // 3. Строка раскладывается по названиям столбцов, а не по позиции
    const row = new Array<string>(headers.length).fill('');
    const put = (column: string, value: string) => {
      const index = headers.indexOf(column);
      if (index >= 0) row[index] = value;
    };
    put('Дата и время', bishkekTimestamp(new Date()));
    put('Язык анкеты', lang);
    put('Время заполнения, мин', durationMin);
    for (const [column, value] of pairs) put(column, value);

    const appended = await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${range}!A1`,
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values: [row] },
    });

    // 4. Номер анкеты — по фактическому номеру строки, поэтому пропусков нет
    const updatedRange = appended.data.updates?.updatedRange ?? '';
    const rowNumber = Number(updatedRange.match(/![A-Z]+(\d+)/)?.[1] ?? 0);
    const number = rowNumber > 1 ? `Н-${String(rowNumber - 1).padStart(4, '0')}` : '';
    if (number) {
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${range}!A${rowNumber}`,
        valueInputOption: 'RAW',
        requestBody: { values: [[number]] },
      });
    }

    return res.status(200).json({ ok: true, number });
  } catch (error) {
    // в ответ не попадают детали ключей и сообщения Google API
    console.error('submit failed:', error instanceof Error ? error.message : 'unknown error');
    return res.status(500).json({ ok: false, error: 'server_error' });
  }
}

function safeParse(input: string): Record<string, unknown> | null {
  try {
    return JSON.parse(input) as Record<string, unknown>;
  } catch {
    return null;
  }
}
