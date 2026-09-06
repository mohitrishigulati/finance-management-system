import { redirect } from "next/navigation";
import { getCurrentUserId } from "@/lib/session";
import { getCashToday } from "@/lib/queries/kpi";
import { formatINR } from "@finance-os/finance-core";

const COLOUR_CLASS = { green: "text-green", amber: "text-amber", red: "text-red" } as const;

export default async function CashTodayPage() {
  const userId = await getCurrentUserId();
  if (!userId) redirect("/setup");

  const data = await getCashToday(userId);

  return (
    <main className="p-4 flex flex-col gap-6">
      <header>
        <p className="text-xs uppercase tracking-[0.22em] text-slate-500">{data.companyName}</p>
        <h1 className="text-lg font-bold">Cash today</h1>
      </header>

      {data.empty ? (
        <p className="text-slate-500 py-12 text-center">Upload your first statement to see runway.</p>
      ) : (
        <>
          <section className="text-center py-4">
            <p className={`text-xl font-bold tabular-nums ${COLOUR_CLASS[data.runwayColour]}`}>
              {Number.isFinite(data.runwayDays) ? `${data.runwayDays} days` : "∞"}
            </p>
            <p className="text-sm text-slate-500">Runway</p>
          </section>

          <section className="grid grid-cols-3 gap-3 text-center">
            <Balance label="Operating" paise={data.operatingBalancePaise} />
            <Balance label="Tax" paise={data.taxBalancePaise} />
            <Balance label="Reserve" paise={data.reserveBalancePaise} />
          </section>

          <section className="border border-slate-200 rounded p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500 mb-1">Core capital target</p>
            <p className="text-base tabular-nums">
              {formatINR(data.coreCapitalTargetPaise)} · gap {formatINR(data.coreCapitalGapPaise)}
            </p>
          </section>

          {data.overdueReceivablesCount > 0 && (
            <a href="/collect" className="border border-slate-200 rounded p-4 block">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500 mb-1">Overdue receivables</p>
              <p className="text-base font-bold tabular-nums text-red">
                {formatINR(data.overdueReceivablesPaise)} · {data.overdueReceivablesCount} invoice
                {data.overdueReceivablesCount === 1 ? "" : "s"}
              </p>
            </a>
          )}

          <section className="flex justify-between text-sm">
            <span>In today: <span className="tabular-nums">{formatINR(data.todayInPaise)}</span></span>
            <span>Out today: <span className="tabular-nums">{formatINR(data.todayOutPaise)}</span></span>
          </section>
        </>
      )}
    </main>
  );
}

function Balance({ label, paise }: { label: string; paise: number }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.15em] text-slate-500">{label}</p>
      <p className="text-base tabular-nums">{formatINR(paise)}</p>
    </div>
  );
}
