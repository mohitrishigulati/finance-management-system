import { redirect } from "next/navigation";
import { getCurrentUserId } from "@/lib/session";
import { withCompanyContext } from "@/lib/db";
import { formatINR } from "@finance-os/finance-core";
import { guessRulePattern } from "@/lib/rules";
import { approveTransactionAction } from "./actions";

export default async function InboxPage() {
  const userId = await getCurrentUserId();
  if (!userId) redirect("/setup");

  const { transactions, categories } = await withCompanyContext(userId, async (client) => {
    const companyRes = await client.query(`select company_id from app_user where id = $1`, [userId]);
    const companyId: string = companyRes.rows[0].company_id;

    const txnRes = await client.query(
      `select id, description_raw, amount, confidence, category_id
         from transaction
        where company_id = $1 and deleted_at is null and (category_id is null or confidence < 0.8)
        order by txn_date desc, created_at desc
        limit 100`,
      [companyId],
    );
    const catRes = await client.query(
      `select id, name from category where company_id = $1 or company_id is null order by name`,
      [companyId],
    );
    return { transactions: txnRes.rows, categories: catRes.rows as { id: string; name: string }[] };
  });

  return (
    <main className="p-4 flex flex-col gap-4">
      <header>
        <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Inbox</p>
        <h1 className="text-lg font-bold">Categorise</h1>
      </header>

      {transactions.length === 0 ? (
        <p className="text-slate-500 py-12 text-center">All categorised.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {transactions.map((t) => (
            <li key={t.id} className="border border-slate-200 rounded p-3">
              <form action={approveTransactionAction.bind(null, t.id)} className="flex flex-col gap-2">
                <div className="flex justify-between text-sm">
                  <span>{t.description_raw}</span>
                  <span className="tabular-nums">{formatINR(t.amount)}</span>
                </div>
                {t.confidence !== null && (
                  <p className="text-xs text-slate-500">AI confidence {(Number(t.confidence) * 100).toFixed(0)}%</p>
                )}
                <select name="category_id" required defaultValue={t.category_id ?? ""} className="border border-slate-200 rounded px-2 py-1 text-sm">
                  <option value="" disabled>
                    Choose category
                  </option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <input
                  name="pattern"
                  defaultValue={guessRulePattern(t.description_raw)}
                  className="border border-slate-200 rounded px-2 py-1 text-sm"
                  aria-label="Rule pattern (contains)"
                />
                <button type="submit" className="bg-primary text-white rounded py-2 text-sm font-medium">
                  Approve
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
