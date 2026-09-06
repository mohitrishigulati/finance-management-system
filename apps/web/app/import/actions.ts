"use server";

import { redirect } from "next/navigation";
import { getCurrentUserId } from "@/lib/session";
import { withCompanyContext } from "@/lib/db";
import { parseStatementFile } from "@/lib/importFile";
import { dedupeHash } from "@/lib/dedupe";
import { matchRule, type CategoryRule } from "@/lib/rules";
import { createHash } from "node:crypto";

export async function importStatementAction(formData: FormData) {
  const userId = await getCurrentUserId();
  if (!userId) redirect("/setup");

  const bankAccountId = String(formData.get("bank_account_id"));
  const file = formData.get("file") as File;
  const buffer = Buffer.from(await file.arrayBuffer());
  const fileHash = createHash("sha256").update(buffer).digest("hex");

  const { rows, errors } = parseStatementFile(file.name, buffer);

  const summary = await withCompanyContext(userId, async (client) => {
    const companyRes = await client.query(`select company_id from app_user where id = $1`, [userId]);
    const companyId: string = companyRes.rows[0].company_id;

    const rulesRes = await client.query<CategoryRule>(
      `select id, match_type, pattern, category_id, party_id from category_rule where company_id = $1 order by hit_count desc`,
      [companyId],
    );
    const rules = rulesRes.rows;

    let rowsNew = 0;
    let rowsDuplicate = 0;

    for (const row of rows) {
      const hash = dedupeHash(bankAccountId, row.txnDate, row.amountPaise, row.descriptionRaw);
      const match = matchRule(row.descriptionRaw, null, rules);

      const insertRes = await client.query(
        `insert into transaction (company_id, bank_account_id, txn_date, description_raw, amount, balance_after, category_id, party_id, confidence, source, dedupe_hash)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,'csv',$10)
         on conflict (company_id, dedupe_hash) do nothing
         returning id`,
        [
          companyId,
          bankAccountId,
          row.txnDate,
          row.descriptionRaw,
          row.amountPaise,
          row.balanceAfterPaise,
          match?.category_id ?? null,
          match?.party_id ?? null,
          match ? 1.0 : null,
          hash,
        ],
      );
      if (insertRes.rowCount && insertRes.rowCount > 0) {
        rowsNew++;
        if (match) {
          await client.query(`update category_rule set hit_count = hit_count + 1 where id = $1`, [match.rule_id]);
        }
      } else {
        rowsDuplicate++;
      }
    }

    await client.query(
      `insert into import_batch (company_id, bank_account_id, file_name, file_hash, rows_total, rows_new, rows_duplicate, rows_error, uploaded_by)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [companyId, bankAccountId, file.name, fileHash, rows.length + errors.length, rowsNew, rowsDuplicate, errors.length, userId],
    );

    return { rowsNew, rowsDuplicate, rowsError: errors.length };
  });

  redirect(`/import?imported=${summary.rowsNew}&duplicate=${summary.rowsDuplicate}&errors=${summary.rowsError}`);
}
