import { withCompanyContext } from "@/lib/db";
import { dedupeHash } from "@/lib/dedupe";
import { matchRule, type CategoryRule } from "@/lib/rules";
import { categorizeTransactions, type CategorizeCandidate } from "@/lib/ai/categorize";
import type { NormalizedRow } from "@/lib/csvImport";

export interface CommitSummary {
  rowsNew: number;
  rowsDuplicate: number;
  rowsError: number;
}

/**
 * Shared commit pipeline (BLUEPRINT.md §3 steps 2-3): rule engine first, AI
 * categorisation (Slice 2) on what rules leave unmatched, then dedupe-safe
 * insert. Used by both the CSV/XLSX import action and the PDF
 * parse-then-confirm flow, so there is exactly one place this logic lives.
 */
export async function commitStatementRows(
  userId: string,
  bankAccountId: string,
  fileName: string,
  fileHash: string,
  rows: NormalizedRow[],
  source: "csv" | "pdf",
  rowsErrorCount: number,
): Promise<CommitSummary> {
  return withCompanyContext(userId, async (client) => {
    const companyRes = await client.query(`select company_id from app_user where id = $1`, [userId]);
    const companyId: string = companyRes.rows[0].company_id;

    const rulesRes = await client.query<CategoryRule>(
      `select id, match_type, pattern, category_id, party_id from category_rule where company_id = $1 order by hit_count desc`,
      [companyId],
    );
    const rules = rulesRes.rows;

    const ruleMatches = rows.map((row) => matchRule(row.descriptionRaw, null, rules));
    const unmatchedCandidates: CategorizeCandidate[] = rows
      .map((row, index) => ({ index, descriptionRaw: row.descriptionRaw, amountPaise: row.amountPaise }))
      .filter((_, index) => !ruleMatches[index]);

    let aiMatches = new Map<number, { category_id: string; party_id: string | null; confidence: number }>();
    if (unmatchedCandidates.length > 0) {
      const categoriesRes = await client.query(`select id, name, "group" from category where company_id = $1 or company_id is null`, [
        companyId,
      ]);
      const partiesRes = await client.query(`select id, name from party where company_id = $1 and deleted_at is null limit 200`, [
        companyId,
      ]);
      aiMatches = await categorizeTransactions(unmatchedCandidates, categoriesRes.rows, partiesRes.rows);
    }

    let rowsNew = 0;
    let rowsDuplicate = 0;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const hash = dedupeHash(bankAccountId, row.txnDate, row.amountPaise, row.descriptionRaw);
      const ruleMatch = ruleMatches[i];
      const aiMatch = aiMatches.get(i);

      const categoryId = ruleMatch?.category_id ?? aiMatch?.category_id ?? null;
      const partyId = ruleMatch?.party_id ?? aiMatch?.party_id ?? null;
      const confidence = ruleMatch ? 1.0 : (aiMatch?.confidence ?? null);

      const insertRes = await client.query(
        `insert into transaction (company_id, bank_account_id, txn_date, description_raw, amount, balance_after, category_id, party_id, confidence, source, dedupe_hash)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
         on conflict (company_id, dedupe_hash) do nothing
         returning id`,
        [companyId, bankAccountId, row.txnDate, row.descriptionRaw, row.amountPaise, row.balanceAfterPaise, categoryId, partyId, confidence, source, hash],
      );
      if (insertRes.rowCount && insertRes.rowCount > 0) {
        rowsNew++;
        if (ruleMatch) {
          await client.query(`update category_rule set hit_count = hit_count + 1 where id = $1`, [ruleMatch.rule_id]);
        }
      } else {
        rowsDuplicate++;
      }
    }

    await client.query(
      `insert into import_batch (company_id, bank_account_id, file_name, file_hash, rows_total, rows_new, rows_duplicate, rows_error, uploaded_by)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [companyId, bankAccountId, fileName, fileHash, rows.length + rowsErrorCount, rowsNew, rowsDuplicate, rowsErrorCount, userId],
    );

    return { rowsNew, rowsDuplicate, rowsError: rowsErrorCount };
  });
}
