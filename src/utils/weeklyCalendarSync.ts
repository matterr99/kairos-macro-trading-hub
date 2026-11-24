/**
 * Automated Weekly Economic Calendar Sync & Raw Investing.com Paste Parser
 * Eliminates manual Gemini CSV conversion for both the Calendar Filter and Valuation Tool.
 */

export interface WeeklyCalendarSyncResult {
  week: 'this' | 'next';
  count: number;
  fetchedAt: string;
  rows: string[][];
  csv: string;
}

const HEADERS = ['Date', 'Time', 'Cur.', 'Event', 'Imp.', 'Actual', 'Forecast', 'Previous'];

export function rowsToCsv(rows: string[][]): string {
  const esc = (v: string) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  return rows.map((r) => r.map(esc).join(',')).join('\n');
}

export function rowsToCsvFile(rows: string[][], filename = 'kairos_auto_sync.csv'): File {
  const csv = rowsToCsv(rows);
  return new File([csv], filename, { type: 'text/csv;charset=utf-8' });
}

export function downloadRowsAsCsv(rows: string[][], filename = 'kairos_calendar_export.csv'): void {
  const csv = rowsToCsv(rows);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    if (document.body.contains(a)) document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 1000);
}

/**
 * Fetches this week's (or next week's) live G10 + China economic calendar
 * via the local Vite proxy (/api/weekly-calendar).
 */
export async function fetchWeeklyCalendar(week: 'this' | 'next' = 'this'): Promise<WeeklyCalendarSyncResult> {
  const res = await fetch(`/api/weekly-calendar?week=${week}`);
  if (!res.ok) {
    if (res.status === 404) {
      throw new Error('Auto-Sync is only available on the local dev server (./start.sh). Use "Paste" or CSV upload on static hosting.');
    }
    let msg = `HTTP ${res.status}`;
    try {
      const errJson = await res.json();
      if (errJson?.error) msg = errJson.error;
    } catch {}
    throw new Error(msg);
  }
  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    throw new Error('Auto-Sync is only available on the local dev server (./start.sh). Use "Paste" or CSV upload on static hosting.');
  }
  const data = (await res.json()) as WeeklyCalendarSyncResult;
  if (!data || !Array.isArray(data.rows) || data.rows.length <= 1) {
    throw new Error('Weekly calendar feed returned no events.');
  }
  return data;
}

const KNOWN_CUR_CODES = new Set([
  'US', 'USA', 'USD', 'EU', 'EUR', 'DE', 'FR', 'IT', 'ES', 'NL', 'BE', 'AT', 'PT', 'GR',
  'UK', 'GB', 'GBP', 'JP', 'JPY', 'AU', 'AUD', 'NZ', 'NZD', 'CA', 'CAD', 'CH', 'CHF',
  'CN', 'CNY', 'CNH',
]);

function stripMarkdownLink(str: string): string {
  // Converts "[CPI (MoM) (Sep)](https://...)" -> "CPI (MoM) (Sep)"
  return str.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/\\([()[\]])/g, '$1').trim();
}

function isStandaloneTimeLine(line: string): boolean {
  return /^(\d{1,2}:\d{2}|all\s*day|tentative|\d{1,2}m)$/i.test(line.trim());
}

function isNumericValueLine(line: string): boolean {
  const s = line.trim();
  if (!s) return false;
  if (/^holiday$/i.test(s)) return false;
  return /^(?:[+-]?\d[\d,]*\.?\d*(?:%|B|M|K|T)?\s*){1,3}$/i.test(s);
}

function extractNumericTokens(numBlock: string): string[] {
  const tokens: string[] = [];
  const chunks = numBlock.split(/\s+/).filter(Boolean);
  for (const chunk of chunks) {
    const dotCount = (chunk.match(/\./g) || []).length;
    if (dotCount >= 2 && !/[%BMKT]/i.test(chunk)) {
      const lastDotIdx = chunk.lastIndexOf('.');
      const decimals = chunk.length - lastDotIdx - 1;
      const re = new RegExp(`[+-]?\\d[\\d,]*\\.\\d{${decimals}}`, 'g');
      const splitDec = chunk.match(re);
      if (splitDec && splitDec.length >= 2) {
        tokens.push(...splitDec);
        continue;
      }
    }
    const matchedTokens = chunk.match(/[+-]?\d[\d,]*\.?\d*(?:%|B|M|K|T)?/gi);
    if (matchedTokens) tokens.push(...matchedTokens);
  }
  return tokens;
}

const MONTH_NAME_TO_NUM: Record<string, number> = {
  january: 1, jan: 1, enero: 1, ene: 1,
  february: 2, feb: 2, febrero: 2,
  march: 3, mar: 3, marzo: 3,
  april: 4, apr: 4, abril: 4, abr: 4,
  may: 5, mayo: 5,
  june: 6, jun: 6, junio: 6,
  july: 7, jul: 7, julio: 7,
  august: 8, aug: 8, agosto: 8, ago: 8,
  september: 9, sep: 9, sept: 9, septiembre: 9,
  october: 10, oct: 10, octubre: 10,
  november: 11, nov: 11, noviembre: 11,
  december: 12, dec: 12, diciembre: 12, dic: 12,
};

function parseCalendarDateHeaderToIso(line: string): string {
  const cleaned = line
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

  // Matches "Thursday, October 1, 2026" or "Lunes, 2 de noviembre de 2026"
  const enMatch = cleaned.match(/\b([a-z]{3,10})\s+(\d{1,2}),?\s+(\d{4})\b/);
  if (enMatch && MONTH_NAME_TO_NUM[enMatch[1]]) {
    const mm = String(MONTH_NAME_TO_NUM[enMatch[1]]).padStart(2, '0');
    const dd = String(parseInt(enMatch[2], 10)).padStart(2, '0');
    return `${enMatch[3]}-${mm}-${dd}`;
  }

  const esMatch = cleaned.match(/\b(\d{1,2})\s+(?:de\s+)?([a-z]{3,10})\s+(?:de\s+)?(\d{4})\b/);
  if (esMatch && MONTH_NAME_TO_NUM[esMatch[2]]) {
    const mm = String(MONTH_NAME_TO_NUM[esMatch[2]]).padStart(2, '0');
    const dd = String(parseInt(esMatch[1], 10)).padStart(2, '0');
    return `${esMatch[3]}-${mm}-${dd}`;
  }

  const parsed = new Date(line);
  if (!isNaN(parsed.getTime())) {
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, '0');
    const d = String(parsed.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return line;
}

function normalizeTimeToken(rawTime: string, currentTimeMins: number | null): string {
  const t = rawTime.trim();
  if (/^\d{1,2}m$/i.test(t) && currentTimeMins !== null) {
    const addMins = parseInt(t, 10);
    const total = (currentTimeMins + addMins) % (24 * 60);
    const hh = String(Math.floor(total / 60)).padStart(2, '0');
    const mm = String(total % 60).padStart(2, '0');
    return `${hh}:${mm}`;
  }
  return t;
}

function assignValueTokens(
  tokens: string[],
  eventDateIso: string,
  timeStr: string,
  currentTimeMins: number | null
): { actual: string; forecast: string; previous: string } {
  if (tokens.length >= 3) {
    return { actual: tokens[0], forecast: tokens[1], previous: tokens[2] };
  }
  if (tokens.length === 2) {
    const todayIso = new Date().toISOString().slice(0, 10);
    let isPast = true;
    if (/^\d{4}-\d{2}-\d{2}$/.test(eventDateIso)) {
      if (eventDateIso < todayIso) {
        isPast = true;
      } else if (eventDateIso > todayIso) {
        isPast = false;
      } else if (currentTimeMins !== null) {
        const hm = timeStr.match(/^(\d{1,2}):(\d{2})$/);
        isPast = hm ? parseInt(hm[1], 10) * 60 + parseInt(hm[2], 10) <= currentTimeMins : false;
      } else {
        isPast = false;
      }
    } else if (currentTimeMins !== null) {
      const hm = timeStr.match(/^(\d{1,2}):(\d{2})$/);
      isPast = hm ? parseInt(hm[1], 10) * 60 + parseInt(hm[2], 10) <= currentTimeMins : true;
    }

    if (isPast) {
      return { actual: tokens[0], forecast: '', previous: tokens[1] };
    }
    return { actual: '', forecast: tokens[0], previous: tokens[1] };
  }
  if (tokens.length === 1) {
    return { actual: '', forecast: '', previous: tokens[0] };
  }
  return { actual: '', forecast: '', previous: '' };
}

/**
 * Parses raw copy-pasted text from the Investing.com Economic Calendar webpage
 * into Investing.com-structured rows: [Date, Time, Cur., Event, Imp., Actual, Forecast, Previous].
 * Supports BOTH:
 * 1) Multi-line cell-per-line browser pastes (including Markdown links `[Event](url)`)
 * 2) Single-line tab/space-separated rows (including concatenated cells like `0.0%0.1%0.4%`)
 */
export function parseRawInvestingPaste(rawText: string): string[][] {
  const lines = String(rawText || '')
    .replace(/\r/g, '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  const rows: string[][] = [HEADERS];
  let currentDate = new Date().toISOString().slice(0, 10);
  let currentTimeMins: number | null = null;

  // Detect Current Time banner: e.g. "Current Time: 14:25 (GMT-4:00)"
  for (const line of lines.slice(0, 12)) {
    const ctMatch = line.match(/current\s*time\s*[:=]?\s*(\d{1,2}):(\d{2})/i);
    if (ctMatch) {
      currentTimeMins = parseInt(ctMatch[1], 10) * 60 + parseInt(ctMatch[2], 10);
      break;
    }
  }

  const dateHeaderRegex =
    /^(Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Domingo|Lunes|Martes|Mi[eé]rcoles|Jueves|Viernes|S[aá]bado),?\s+.+\d{4}$/i;
  const headerWordRegex = /^(time|hora|cur\.?|div\.?|currency|event|evento|imp\.?|actual|forecast|previsi[oó]n|previous|anterior)$/i;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^current\s*time/i.test(line)) continue;
    if (/^(time|hora)\s+(cur|div)/i.test(line)) continue;
    if (headerWordRegex.test(line)) continue;

    if (dateHeaderRegex.test(line)) {
      currentDate = parseCalendarDateHeaderToIso(line);
      continue;
    }

    // FORMAT A: Multi-line cell-per-line paste (Time on line i, Cur. on line i+1, Event on line i+2, optional numeric lines)
    if (isStandaloneTimeLine(line) && i + 2 < lines.length) {
      const nextCur = lines[i + 1].toUpperCase().trim();
      if (KNOWN_CUR_CODES.has(nextCur)) {
        const timeStr = normalizeTimeToken(line, currentTimeMins);
        const eventName = stripMarkdownLink(lines[i + 2]).replace(/\s+/g, ' ').trim();
        let j = i + 3;
        const collectedTokens: string[] = [];

        while (j < lines.length) {
          const cand = lines[j];
          if (dateHeaderRegex.test(cand) || isStandaloneTimeLine(cand)) break;
          if (/^(\d{1,2}:\d{2}|all\s*day|tentative|\d{1,2}m)\s+/i.test(cand)) break;
          if (/^holiday$/i.test(cand)) {
            j++;
            break;
          }
          if (isNumericValueLine(cand)) {
            collectedTokens.push(...extractNumericTokens(cand));
            j++;
            if (collectedTokens.length >= 3) break;
          } else {
            break;
          }
        }

        if (eventName && !/^holiday$/i.test(eventName)) {
          const { actual, forecast, previous } = assignValueTokens(
            collectedTokens,
            currentDate,
            timeStr,
            currentTimeMins
          );
          rows.push([currentDate, timeStr, nextCur, eventName, '', actual, forecast, previous]);
        }

        i = j - 1;
        continue;
      }
    }

    // FORMAT B: Single-line paste ("08:30 US Core PCE Price Index (MoM) 0.3% 0.2% 0.2%")
    const timeMatch = line.match(/^(\d{1,2}:\d{2}|all\s*day|tentative|\d{1,2}m)\s+(.+)$/i);
    if (!timeMatch) continue;

    const timeStr = normalizeTimeToken(timeMatch[1], currentTimeMins);
    const rest = timeMatch[2].trim();

    const ccyMatch = rest.match(/^([A-Za-z]{2,3})\s+(.+)$/);
    if (!ccyMatch) continue;
    const rawCcy = ccyMatch[1].toUpperCase();
    if (!KNOWN_CUR_CODES.has(rawCcy)) continue;

    const eventAndNums = stripMarkdownLink(ccyMatch[2]).replace(/\s+/g, ' ').trim();
    const trailingBlockMatch = eventAndNums.match(
      /^(.*?)(\s+(?:[+-]?\d[\d,]*\.?\d*(?:%|B|M|K|T)?\s*){1,3})$/i
    );

    let eventName = eventAndNums;
    let tokens: string[] = [];

    if (trailingBlockMatch) {
      eventName = trailingBlockMatch[1].trim();
      tokens = extractNumericTokens(trailingBlockMatch[2].trim());
    }

    if (!eventName) continue;

    const { actual, forecast, previous } = assignValueTokens(
      tokens,
      currentDate,
      timeStr,
      currentTimeMins
    );
    rows.push([currentDate, timeStr, rawCcy, eventName, '', actual, forecast, previous]);
  }

  return rows;
}
