import Papa from "papaparse";

export interface NormalizedRow {
  txnDate: string; // YYYY-MM-DD
  descriptionRaw: string;
  amountPaise: number; // signed: credit +, debit -
  balanceAfterPaise: number | null;
}

const HEADER_ALIASES: Record<keyof typeof COLUMN_KEYS, string[]> = {
  date: ["date", "txn date", "transaction date", "value date", "posting date"],
  description: ["description", "narration", "particulars", "remarks", "transaction remarks", "details"],
  debit: ["debit", "withdrawal", "withdrawal amt", "withdrawal amt.", "debit amount"],
  credit: ["credit", "deposit", "deposit amt", "deposit amt.", "credit amount"],
  amount: ["amount"],
  balance: ["balance", "closing balance", "balance after", "available balance"],
};

const COLUMN_KEYS = { date: 0, description: 0, debit: 0, credit: 0, amount: 0, balance: 0 };

function normaliseHeader(h: string): string {
  return h.trim().toLowerCase().replace(/\s+/g, " ");
}

function findColumn(headers: string[], aliases: string[]): string | null {
  const normalised = headers.map(normaliseHeader);
  for (const alias of aliases) {
    const idx = normalised.indexOf(alias);
    if (idx >= 0) return headers[idx];
  }
  return null;
}

function parseMoney(raw: string | undefined): number | null {
  if (raw === undefined || raw === null) return null;
  const cleaned = String(raw).replace(/[₹,\s]/g, "");
  if (cleaned === "" || cleaned === "-") return null;
  const value = Number.parseFloat(cleaned);
  if (Number.isNaN(value)) return null;
  return Math.round(value * 100);
}

function parseDate(raw: string): string | null {
  const trimmed = raw.trim();
  // DD/MM/YYYY or DD-MM-YYYY
  const dmy = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (dmy) {
    const [, d, m, y] = dmy;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  // YYYY-MM-DD already
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const parsed = new Date(trimmed);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  return null;
}

export interface ParseResult {
  rows: NormalizedRow[];
  errors: { line: number; message: string }[];
}

/** Generic bank-CSV column mapper (BLUEPRINT.md §4 Must #2). Per-bank parsers are a later slice. */
export function parseBankCsv(csvText: string): ParseResult {
  const parsed = Papa.parse<Record<string, string>>(csvText, { header: true, skipEmptyLines: true });
  return mapRows(parsed.data, parsed.meta.fields ?? []);
}

/** Same column mapping, for rows already extracted from an XLSX sheet (see lib/importFile.ts). */
export function parseBankRows(headers: string[], data: Record<string, string>[]): ParseResult {
  return mapRows(data, headers);
}

function mapRows(data: Record<string, string>[], headers: string[]): ParseResult {
  const dateCol = findColumn(headers, HEADER_ALIASES.date);
  const descCol = findColumn(headers, HEADER_ALIASES.description);
  const debitCol = findColumn(headers, HEADER_ALIASES.debit);
  const creditCol = findColumn(headers, HEADER_ALIASES.credit);
  const amountCol = findColumn(headers, HEADER_ALIASES.amount);
  const balanceCol = findColumn(headers, HEADER_ALIASES.balance);

  if (!dateCol || !descCol || (!amountCol && !debitCol && !creditCol)) {
    return {
      rows: [],
      errors: [{ line: 0, message: `Could not find date/description/amount columns. Headers found: ${headers.join(", ")}` }],
    };
  }

  const rows: NormalizedRow[] = [];
  const errors: ParseResult["errors"] = [];

  data.forEach((raw, i) => {
    const line = i + 2; // header is line 1
    const txnDate = parseDate(raw[dateCol] ?? "");
    if (!txnDate) {
      errors.push({ line, message: `Unrecognised date: "${raw[dateCol]}"` });
      return;
    }
    const descriptionRaw = (raw[descCol] ?? "").trim();

    let amountPaise: number | null = null;
    if (amountCol) {
      amountPaise = parseMoney(raw[amountCol]);
    } else {
      const debit = parseMoney(debitCol ? raw[debitCol] : undefined) ?? 0;
      const credit = parseMoney(creditCol ? raw[creditCol] : undefined) ?? 0;
      amountPaise = credit - debit;
    }
    if (amountPaise === null) {
      errors.push({ line, message: "Unrecognised or missing amount" });
      return;
    }

    const balanceAfterPaise = balanceCol ? parseMoney(raw[balanceCol]) : null;
    rows.push({ txnDate, descriptionRaw, amountPaise, balanceAfterPaise });
  });

  return { rows, errors };
}
