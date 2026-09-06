"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUserId } from "@/lib/session";
import { withCompanyContext } from "@/lib/db";

/**
 * BLUEPRINT.md §3 step 3 / §10.3: approving a transaction in the Inbox both
 * categorises it and writes exactly one category_rule, so the next matching
 * transaction resolves by rule (free) instead of by AI (a paid call).
 */
export async function approveTransactionAction(transactionId: string, formData: FormData) {
  const userId = await getCurrentUserId();
  if (!userId) return;

  const categoryId = String(formData.get("category_id"));
  const partyId = formData.get("party_id") ? String(formData.get("party_id")) : null;
  const pattern = String(formData.get("pattern")).trim();
  if (!categoryId || !pattern) return;

  await withCompanyContext(userId, async (client) => {
    const companyRes = await client.query(`select company_id from app_user where id = $1`, [userId]);
    const companyId: string = companyRes.rows[0].company_id;

    await client.query(
      `update transaction set category_id = $1, party_id = $2, confidence = 1.0, reviewed_by = $3
       where id = $4 and company_id = $5`,
      [categoryId, partyId, userId, transactionId, companyId],
    );

    await client.query(
      `insert into category_rule (company_id, match_type, pattern, category_id, party_id, created_by)
       values ($1,'contains',$2,$3,$4,$5)`,
      [companyId, pattern, categoryId, partyId, userId],
    );
  });

  revalidatePath("/inbox");
}
