// zodOutputFormat (Anthropic SDK structured outputs helper) requires schemas
// built from the zod/v4 namespace, even though the rest of the app uses the
// classic zod v3 API — zod 3.25+ ships both side by side.
import { z } from "zod/v4";

/** BLUEPRINT.md §12 — Categorise job output. Validated before use; a row that fails validation is dropped (stays uncategorised, queued to Inbox), never guessed. */
export const categorisationResultSchema = z.object({
  results: z.array(
    z.object({
      txn_index: z.number().int().min(0),
      category_name: z.string().min(1),
      party_name: z.string().nullable().optional(),
      confidence: z.number().min(0).max(1),
      reason: z.string(),
    }),
  ),
});
export type CategorisationResult = z.infer<typeof categorisationResultSchema>;

/** BLUEPRINT.md §12 — Parse PDF statement job output. */
export const pdfStatementRowSchema = z.object({
  rows: z.array(
    z.object({
      date: z.string(), // as printed; normalised afterwards
      description: z.string(),
      debit: z.number().nullable(),
      credit: z.number().nullable(),
      balance: z.number().nullable(),
    }),
  ),
});
export type PdfStatementRows = z.infer<typeof pdfStatementRowSchema>;
