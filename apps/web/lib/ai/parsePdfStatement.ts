import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { getAnthropicClient, hasAI, PDF_PARSE_MODEL } from "./client";
import { pdfStatementRowSchema } from "./schemas";
import type { NormalizedRow } from "@/lib/csvImport";

export interface PdfParseOutcome {
  rows: NormalizedRow[];
  warnings: string[];
}

const DMY = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/;

function normaliseDate(raw: string): string {
  const m = raw.trim().match(DMY);
  if (m) {
    const [, d, mo, y] = m;
    return `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? raw : parsed.toISOString().slice(0, 10);
}

/**
 * BLUEPRINT.md §12 — Parse PDF statement job. Extracts rows with Claude,
 * then cross-checks the running balance the model transcribed against the
 * amounts it also transcribed — a mismatch means a misread row, and the
 * whole file is flagged for closer look on the confirmation screen rather
 * than silently trusted (§12 guardrail: "cross-check running balance").
 */
export async function parsePdfStatement(pdfBase64: string): Promise<PdfParseOutcome> {
  if (!hasAI()) {
    return { rows: [], warnings: ["ANTHROPIC_API_KEY is not set — PDF parsing needs the AI job. Use CSV/XLSX export instead, or set the key."] };
  }

  const client = getAnthropicClient();
  const response = await client.messages.parse({
    model: PDF_PARSE_MODEL,
    max_tokens: 8192,
    messages: [
      {
        role: "user",
        content: [
          { type: "document", source: { type: "base64", media_type: "application/pdf", data: pdfBase64 } },
          {
            type: "text",
            text: "Extract every transaction row from this bank statement: date, description, debit amount (null if none), credit amount (null if none), and the running balance shown on that row (null if not shown). Use the numbers exactly as printed, without currency symbols or thousands separators.",
          },
        ],
      },
    ],
    output_config: { format: zodOutputFormat(pdfStatementRowSchema) },
  });

  const parsed = response.parsed_output;
  if (!parsed) {
    return { rows: [], warnings: ["Could not extract a valid table from this PDF. Try a CSV/XLSX export instead."] };
  }

  const rows: NormalizedRow[] = parsed.rows.map((r) => ({
    txnDate: normaliseDate(r.date),
    descriptionRaw: r.description,
    amountPaise: Math.round(((r.credit ?? 0) - (r.debit ?? 0)) * 100),
    balanceAfterPaise: r.balance === null ? null : Math.round(r.balance * 100),
  }));

  const warnings: string[] = [];
  for (let i = 1; i < rows.length; i++) {
    const prev = rows[i - 1];
    const curr = rows[i];
    if (prev.balanceAfterPaise === null || curr.balanceAfterPaise === null) continue;
    const expected = prev.balanceAfterPaise + curr.amountPaise;
    if (Math.abs(expected - curr.balanceAfterPaise) > 1) {
      warnings.push(`Row ${i + 1} ("${curr.descriptionRaw}"): balance doesn't reconcile — check this row before confirming.`);
    }
  }

  return { rows, warnings };
}
