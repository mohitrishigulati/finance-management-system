import * as XLSX from "xlsx";
import { parseBankCsv, parseBankRows, type ParseResult } from "./csvImport";

/** Accepts a .csv or .xlsx upload and returns the same normalised row shape either way. */
export function parseStatementFile(fileName: string, buffer: Buffer): ParseResult {
  if (fileName.toLowerCase().endsWith(".xlsx") || fileName.toLowerCase().endsWith(".xls")) {
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { defval: "", raw: false });
    const headers = rows.length > 0 ? Object.keys(rows[0]) : [];
    return parseBankRows(headers, rows);
  }
  return parseBankCsv(buffer.toString("utf8"));
}
