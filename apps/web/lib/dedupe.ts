import { createHash } from "node:crypto";

/** dedupe_hash = bank_account + date + amount + description (BLUEPRINT.md §5.1/§5.3). Re-import is safe. */
export function dedupeHash(bankAccountId: string, txnDate: string, amountPaise: number, descriptionRaw: string): string {
  return createHash("sha256").update(`${bankAccountId}|${txnDate}|${amountPaise}|${descriptionRaw.trim().toLowerCase()}`).digest("hex");
}
