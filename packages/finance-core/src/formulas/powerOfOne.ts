/** FORMULAS.md §9.5 — Power of One (7 levers), trailing-12-month basis. */

export interface PowerOfOneInputs {
  revenueTtm: number;
  grossMarginTtm: number;
  directNonLabourTtm: number;
  directLabourTtm: number;
  opexTtm: number;
  salesLabourTtm: number;
  mgmtLabourTtm: number;
  /** working_capital / revenue, as a fraction (e.g. 0.1 for 10%). */
  workingCapitalPct: number;
  cogsTtm?: number;
  hasInventory?: boolean;
}

export interface LeverImpact {
  lever:
    | "price"
    | "volume"
    | "direct_costs"
    | "opex"
    | "receivable_days"
    | "inventory_days"
    | "payable_days";
  cashImpact: number;
  profitImpact: number;
}

export function powerOfOne(inputs: PowerOfOneInputs): { levers: LeverImpact[]; totalCash: number; totalProfit: number } {
  const {
    revenueTtm,
    grossMarginTtm,
    directNonLabourTtm,
    directLabourTtm,
    opexTtm,
    salesLabourTtm,
    mgmtLabourTtm,
    workingCapitalPct,
    cogsTtm = 0,
    hasInventory = false,
  } = inputs;

  const price = revenueTtm * 0.01;
  const volumeProfit = grossMarginTtm * 0.01;
  const volumeCash = volumeProfit - workingCapitalPct * revenueTtm * 0.01;
  const directCosts = (directNonLabourTtm + directLabourTtm) * 0.01;
  const opex = (opexTtm + salesLabourTtm + mgmtLabourTtm) * 0.01;
  const ar1day = revenueTtm / 365;
  const inventory1day = hasInventory ? cogsTtm / 365 : 0;
  const ap1day = (directNonLabourTtm + opexTtm) / 365;

  const levers: LeverImpact[] = [
    { lever: "price", cashImpact: price, profitImpact: price },
    { lever: "volume", cashImpact: volumeCash, profitImpact: volumeProfit },
    { lever: "direct_costs", cashImpact: directCosts, profitImpact: directCosts },
    { lever: "opex", cashImpact: opex, profitImpact: opex },
    { lever: "receivable_days", cashImpact: ar1day, profitImpact: 0 },
    { lever: "inventory_days", cashImpact: inventory1day, profitImpact: 0 },
    { lever: "payable_days", cashImpact: ap1day, profitImpact: 0 },
  ];

  levers.sort((a, b) => b.cashImpact - a.cashImpact);

  const totalCash = levers.reduce((sum, l) => sum + l.cashImpact, 0);
  const totalProfit = levers.reduce((sum, l) => sum + l.profitImpact, 0);

  return { levers, totalCash, totalProfit };
}
