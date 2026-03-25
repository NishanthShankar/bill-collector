/**
 * Regex/heuristic bill parser.
 * Extracts amount, date, merchant, and description from raw OCR text.
 * Returns null for any field it can't confidently determine.
 */

export interface ParsedBill {
  amount: number | null;
  currency: string;
  date: string | null;
  merchant: string | null;
  description: string | null;
  rawText: string;
}

const MONTHS: Record<string, string> = {
  jan: "01", january: "01",
  feb: "02", february: "02",
  mar: "03", march: "03",
  apr: "04", april: "04",
  may: "05",
  jun: "06", june: "06",
  jul: "07", july: "07",
  aug: "08", august: "08",
  sep: "09", sept: "09", september: "09",
  oct: "10", october: "10",
  nov: "11", november: "11",
  dec: "12", december: "12",
};

const CURRENCY_DETECT = /₹|Rs\.?|INR|rupee/i;
const AMOUNT_KEYWORDS = /total|amount\s*due|balance\s*due|grand\s*total|pay\s*this\s*amount|total\s*due|amount\s*owed/i;
const DATE_KEYWORDS = /due\s*date|payment\s*due|pay\s*by|due\s*on|due/i;
const DESCRIPTION_KEYWORDS = /service|invoice|account|plan|subscription|statement|billing|utility|electric|gas|water|internet|phone|rent|insurance|mortgage/i;

export function parseBillText(rawText: string): ParsedBill {
  const lines = rawText.split("\n").map((l) => l.trim()).filter(Boolean);

  return {
    amount: extractAmount(rawText, lines),
    currency: detectCurrency(rawText),
    date: extractDate(rawText, lines),
    merchant: extractMerchant(lines),
    description: extractDescription(lines),
    rawText,
  };
}

// --- Currency detection ---

function detectCurrency(text: string): string {
  if (/₹|Rs\.?|INR|rupee/i.test(text)) return "INR";
  if (/£|GBP|pound\s*sterling/i.test(text)) return "GBP";
  if (/€|EUR|euro/i.test(text)) return "EUR";
  if (/\$|USD|dollar/i.test(text)) return "USD";
  return "INR";
}

// --- Amount extraction ---

function extractAmount(text: string, lines: string[]): number | null {
  // Pattern: optional $, digits with optional commas, decimal point, cents
  const amountPattern = /\$?\s?(\d{1,3}(?:,\d{3})*(?:\.\d{2}))/g;

  // First pass: look for amounts near "total"/"due" keywords
  for (const line of lines) {
    if (AMOUNT_KEYWORDS.test(line)) {
      const matches = [...line.matchAll(amountPattern)];
      if (matches.length > 0) {
        const last = matches[matches.length - 1];
        return parseAmount(last[1]);
      }
    }
  }

  // Second pass: collect all amounts from entire text, take the largest
  const allMatches = [...text.matchAll(amountPattern)];
  if (allMatches.length === 0) return null;

  let largest = 0;
  for (const match of allMatches) {
    const val = parseAmount(match[1]);
    if (val !== null && val > largest) {
      largest = val;
    }
  }

  return largest > 0 ? largest : null;
}

function parseAmount(str: string): number | null {
  const cleaned = str.replace(/,/g, "");
  const val = parseFloat(cleaned);
  return isNaN(val) ? null : val;
}

// --- Date extraction ---

function extractDate(text: string, lines: string[]): string | null {
  // First pass: look for dates near "due" keywords
  for (const line of lines) {
    if (DATE_KEYWORDS.test(line)) {
      const date = parseDateFromLine(line);
      if (date) return date;
    }
  }

  // Second pass: find any date in the text
  for (const line of lines) {
    const date = parseDateFromLine(line);
    if (date) return date;
  }

  return null;
}

function parseDateFromLine(line: string): string | null {
  // MM/DD/YYYY or MM-DD-YYYY
  const slashDate = line.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (slashDate) {
    const [, m, d, y] = slashDate;
    return formatDate(y, m.padStart(2, "0"), d.padStart(2, "0"));
  }

  // YYYY-MM-DD
  const isoDate = line.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (isoDate) {
    const [, y, m, d] = isoDate;
    return formatDate(y, m, d);
  }

  // Mon DD, YYYY or Month DD, YYYY
  const monthNameDate = line.match(
    /\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+(\d{1,2}),?\s*(\d{4})\b/i
  );
  if (monthNameDate) {
    const [, monthStr, d, y] = monthNameDate;
    const m = MONTHS[monthStr.toLowerCase()];
    if (m) return formatDate(y, m, d.padStart(2, "0"));
  }

  // DD Mon YYYY or DD Month YYYY
  const dayFirstDate = line.match(
    /\b(\d{1,2})\s+(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+(\d{4})\b/i
  );
  if (dayFirstDate) {
    const [, d, monthStr, y] = dayFirstDate;
    const m = MONTHS[monthStr.toLowerCase()];
    if (m) return formatDate(y, m, d.padStart(2, "0"));
  }

  return null;
}

function formatDate(y: string, m: string, d: string): string | null {
  const year = parseInt(y);
  const month = parseInt(m);
  const day = parseInt(d);
  if (year < 1900 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }
  return `${y}-${m}-${d}`;
}

// --- Merchant extraction ---

function extractMerchant(lines: string[]): string | null {
  // Take the first non-empty, non-numeric line that looks like a name
  for (const line of lines.slice(0, 5)) {
    const cleaned = line.replace(/[^a-zA-Z0-9\s&'.,-]/g, "").trim();
    // Skip lines that are mostly numbers or very short
    if (cleaned.length < 3) continue;
    if (/^\d+$/.test(cleaned)) continue;
    // Skip lines that look like dates or amounts
    if (/^\$?\d/.test(cleaned) && cleaned.length < 15) continue;
    if (/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}$/.test(cleaned)) continue;

    return toTitleCase(cleaned);
  }
  return null;
}

function toTitleCase(str: string): string {
  return str
    .toLowerCase()
    .replace(/(?:^|\s|[-&])\S/g, (char) => char.toUpperCase());
}

// --- Description extraction ---

function extractDescription(lines: string[]): string | null {
  for (const line of lines) {
    if (DESCRIPTION_KEYWORDS.test(line)) {
      const cleaned = line.replace(/[^a-zA-Z0-9\s&'.,-]/g, "").trim();
      if (cleaned.length > 5 && cleaned.length < 100) {
        return cleaned;
      }
    }
  }
  return null;
}
