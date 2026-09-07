const MONTHS: Record<string, number> = {
  january: 1, jan: 1, february: 2, feb: 2, march: 3, mar: 3, april: 4, apr: 4,
  may: 5, june: 6, jun: 6, july: 7, jul: 7, august: 8, aug: 8, september: 9,
  sept: 9, sep: 9, october: 10, oct: 10, november: 11, nov: 11, december: 12, dec: 12,
};

const PRESENT = /^(?:present|current|now|till\s+date|to\s+date|ongoing)$/i;

const MONTH_NAMES = Object.keys(MONTHS).join("|");
const TOKEN = String.raw`(?:(?:MONTHS)\.?\s*'?\d{2,4}|\d{1,2}[\/.]\d{4}|\d{4})`.replace(
  "MONTHS",
  MONTH_NAMES,
);
const END_TOKEN = String.raw`(?:TOKEN|present|current|now|ongoing|till\s+date|to\s+date)`.replace(
  "TOKEN",
  TOKEN,
);
const SEP = String.raw`\s*(?:–|—|-|to|until|through)\s*`;

const RANGE = new RegExp(`(${TOKEN})${SEP}(${END_TOKEN})`, "i");
const RANGE_GLOBAL = new RegExp(`(${TOKEN})${SEP}(${END_TOKEN})`, "gi");
const NAMED = new RegExp(String.raw`^(MONTHS)\.?\s*'?(\d{2,4})$`.replace("MONTHS", MONTH_NAMES), "i");

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function expandYear(raw: string): number {
  const n = Number(raw);
  if (raw.length === 4) return n;
  return n > 50 ? 1900 + n : 2000 + n;
}

export function normaliseDate(raw: string): string | null {
  const value = raw.trim().replace(/^'/, "");
  if (value.length === 0) return null;
  if (PRESENT.test(value)) return "present";

  const named = value.match(NAMED);
  if (named !== null) {
    const month = MONTHS[named[1]!.toLowerCase()];
    if (month !== undefined) return `${expandYear(named[2]!)}-${pad(month)}`;
  }

  const numeric = value.match(/^(\d{1,2})[\/.](\d{4})$/);
  if (numeric !== null) {
    const month = Number(numeric[1]);
    if (month >= 1 && month <= 12) return `${numeric[2]}-${pad(month)}`;
  }

  const year = value.match(/^(\d{4})$/);
  if (year !== null) {
    const n = Number(year[1]);
    if (n >= 1900 && n <= 2100) return year[1]!;
  }

  return null;
}

export type DateRange = { startDate: string | null; endDate: string | null };

export function findDateRange(line: string): DateRange | null {
  const match = line.match(RANGE);
  if (match === null) return null;
  const start = normaliseDate(match[1]!);
  const end = normaliseDate(match[2]!);
  if (start === null && end === null) return null;
  return { startDate: start, endDate: end };
}

export function hasDateRange(line: string): boolean {
  return RANGE.test(line);
}

export function stripDateRange(line: string): string {
  return line
    .replace(RANGE_GLOBAL, " ")
    .replace(/\s*[|·•,–—-]\s*$/, "")
    .replace(/^\s*[|·•,–—-]\s*/, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}
