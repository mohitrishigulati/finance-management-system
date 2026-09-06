/** FORMULAS.md §9.4 — Labour Efficiency Ratios. */

export function directLER(grossMargin: number, directLabour: number): number | null {
  if (directLabour === 0) return null;
  return grossMargin / directLabour;
}

export function salesLER(contributionMargin: number, salesLabour: number): number | null {
  if (salesLabour === 0) return null;
  return contributionMargin / salesLabour;
}

export function mgmtLER(contributionMargin: number, mgmtLabour: number): number | null {
  if (mgmtLabour === 0) return null;
  return contributionMargin / mgmtLabour;
}

export type HiringSignal = "hold costs" | "may add labour down to 10%";

export function hiringSignal(truePretaxProfitPct: number): HiringSignal {
  return truePretaxProfitPct >= 15 ? "may add labour down to 10%" : "hold costs";
}

/**
 * Solve for R: (GM_ratio * R) - fixedCosts = 0.15 * R
 * => R = fixedCosts / (GM_ratio - 0.15)
 */
export function revenueNeededForTargetProfitPct(inputs: {
  grossMarginRatio: number;
  fixedCosts: number;
  targetPct?: number;
}): number {
  const { grossMarginRatio, fixedCosts, targetPct = 15 } = inputs;
  const targetRatio = targetPct / 100;
  const denominator = grossMarginRatio - targetRatio;
  if (denominator <= 0) return Infinity;
  return fixedCosts / denominator;
}
