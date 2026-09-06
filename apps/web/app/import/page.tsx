import { redirect } from "next/navigation";
import { getCurrentUserId } from "@/lib/session";
import { withCompanyContext } from "@/lib/db";
import { importStatementAction } from "./actions";

export default async function ImportPage({
  searchParams,
}: {
  searchParams: Promise<{ imported?: string; duplicate?: string; errors?: string }>;
}) {
  const userId = await getCurrentUserId();
  if (!userId) redirect("/setup");
  const params = await searchParams;

  const accounts = await withCompanyContext(userId, async (client) => {
    const res = await client.query(
      `select ba.id, ba.name, ba.bucket from bank_account ba
       join app_user u on u.company_id = ba.company_id
       where u.id = $1 and ba.deleted_at is null order by ba.bucket`,
      [userId],
    );
    return res.rows as { id: string; name: string; bucket: string }[];
  });

  return (
    <main className="p-4 flex flex-col gap-6">
      <header>
        <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Import</p>
        <h1 className="text-lg font-bold">Upload a bank statement</h1>
      </header>

      {params.imported !== undefined && (
        <div className="border border-slate-200 rounded p-4 text-sm">
          <p>
            Imported <b>{params.imported}</b> new · {params.duplicate} already seen · {params.errors} rows with errors.
          </p>
        </div>
      )}

      <form action={importStatementAction} className="flex flex-col gap-4">
        <div>
          <label className="text-sm text-slate-600 mb-1 block" htmlFor="bank_account_id">
            Account
          </label>
          <select id="bank_account_id" name="bank_account_id" required className="w-full border border-slate-200 rounded px-3 py-2">
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} ({a.bucket})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-sm text-slate-600 mb-1 block" htmlFor="file">
            Statement file (.csv or .xlsx)
          </label>
          <input id="file" name="file" type="file" accept=".csv,.xlsx,.xls" required className="w-full" />
        </div>
        <button type="submit" className="bg-primary text-white rounded py-3 text-base font-medium">
          Import
        </button>
      </form>

      <a href="/cash-today" className="text-sm text-primary text-center">
        Go to Cash Today →
      </a>
    </main>
  );
}
