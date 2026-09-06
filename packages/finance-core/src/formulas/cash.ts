/**
 * FORMULAS.md §9.1 — Cash.
 *
 * v1 simplification (recorded in docs/DECISIONS.md and FORMULAS.md "Known
 * formula gaps"): avg_daily_outflow is derived from the monthly recurring
 * cost figure also used for the Core Capital Target (direct + sales + mgmt
 * labour + opex + owner market salary), divided by 30 — not a 90-day trailing
 * average of bank debits. labour_cost is monthly-granularity data in v1
 * (BLUEPRINT.md §4 SHOULD list), so a 90-day transaction-based average isn't
 * available until the SHOULD-later employee register ships; this keeps
 * runway and the Core Capital Target internally consistent off the same
 * monthly figure, which is also how the Meera fixture (BLUEPRINT.md §18) is
 * computed in the source narrative.
 *
 * A second deviation from the literal formula text, also reconciled against
 * the Meera fixture: FORMULAS.md's monthly_opex_for_core_capital excludes
 * "COGS bought on terms," i.e. direct non-labour costs paid on supplier
 * credit. But Meera's own ₹3,70,000 total (BLUEPRINT.md Layer 1 box)
 * includes her ₹10,000 gateway/materials line, because a payment-gateway fee
 * or a small materials purchase for a coaching business is paid instantly on
 * the transaction, not "on terms." v1 has no field yet distinguishing
 * credit-term COGS from immediately-paid non-labour direct costs, so
 * directNonLabour is included here; a template or category flag for
 * "on-terms COGS" to exclude is a SHOULD-later refinement (see docs/DECISIONS.md).
 */

export interface MonthlyOutflowInputs {
  directNonLabour: number;
  directLabour: number;
  salesLabour: number;
  mgmtLabour: number;
  opex: number;
  ownerMarketSalary: number;
  /** Amount of ownerMarketSalary the owner has actually drawn this month, if any is booked as a draw already counted above. Defaults to 0 (Meera fixture: owner draws whatever is left, not a fixed booked salary). */
  ownerDrawAlreadyCounted?: number;
}

export function monthlyOpexForCoreCapital(inputs: MonthlyOutflowInputs): number {
  const { directNonLabour, directLabour, salesLabour, mgmtLabour, opex, ownerMarketSalary, ownerDrawAlreadyCounted = 0 } = inputs;
  const ownerShortfall = Math.max(0, ownerMarketSalary - ownerDrawAlreadyCounted);
  return directNonLabour + directLabour + salesLabour + mgmtLabour + opex + ownerShortfall;
}

export function avgDailyOutflow(monthlyOpex: number, daysInMonth = 30): number {
  return monthlyOpex / daysInMonth;
}

/**
 * Runway in days. Rounded to the nearest whole day rather than floored:
 * the Meera fixture (cash ₹1,10,000 ÷ ~₹12,333/day = 8.92 days) is
 * documented in BLUEPRINT.md as "Runway: 9 days" — a business either has
 * "about 9 days" or it doesn't, and nearest-day framing is what an owner
 * reads on the daily WhatsApp message.
 */
export function runwayDays(cashOperating: number, dailyOutflow: number): number {
  if (dailyOutflow <= 0) return Infinity;
  return Math.round(cashOperating / dailyOutflow);
}

export function coreCapitalTarget(monthlyOpex: number): number {
  return 2 * monthlyOpex;
}

export function coreCapitalFillPct(cashReserve: number, target: number): number {
  if (target <= 0) return 100;
  return (cashReserve / target) * 100;
}
