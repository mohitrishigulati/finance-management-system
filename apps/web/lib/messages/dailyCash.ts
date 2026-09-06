import { formatDateIN, formatINR } from "@finance-os/finance-core";
import type { CashSnapshot } from "@/lib/queries/aggregates";

/** BLUEPRINT.md §11 — Daily · 6:00pm IST template. */
export function renderDailyCashMessage(companyName: string, snapshot: CashSnapshot, asOf = new Date()): string {
  const oneLine =
    snapshot.overdueReceivablesCount > 0
      ? `${snapshot.overdueReceivablesCount} invoice${snapshot.overdueReceivablesCount === 1 ? "" : "s"} overdue, ${formatINR(snapshot.overdueReceivablesPaise)} outstanding.`
      : "No overdue receivables.";

  return [
    `${companyName} · ${formatDateIN(asOf)}`,
    `In ${formatINR(snapshot.todayInPaise)} · Out ${formatINR(snapshot.todayOutPaise)}`,
    `Operating ${formatINR(snapshot.operatingBalancePaise)} · Tax ${formatINR(snapshot.taxBalancePaise)} · Reserve ${formatINR(snapshot.reserveBalancePaise)}`,
    `Runway ${Number.isFinite(snapshot.runwayDays) ? `${snapshot.runwayDays} days` : "∞"}`,
    oneLine,
  ].join("\n");
}
