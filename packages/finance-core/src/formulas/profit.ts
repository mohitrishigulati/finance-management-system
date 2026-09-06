/** FORMULAS.md §9.3 — True Profit (Simple Numbers). */

export type LabourBucket = "direct" | "sales" | "management";

export interface TrueProfitInputs {
  revenue: number;
  directNonLabour: number;
  directLabour: number;
  salesLabour: number;
  mgmtLabour: number;
  opex: number;
  ownerMarketSalary: number;
  ownerBucket: LabourBucket;
  /** Owner draw actually booked as an expense in the compliance (CA) books. */
  actualOwnerDrawExpensed: number;
}

export interface TrueProfitResult {
  grossMargin: number;
  contributionMargin: number;
  truePretaxProfit: number;
  profitBasis: "revenue" | "gross_margin";
  trueProfitPct: number;
  ownerDistortion: number;
  complianceProfit: number;
}

export function trueProfit(inputs: TrueProfitInputs): TrueProfitResult {
  const {
    revenue,
    directNonLabour,
    directLabour: directLabourInput,
    salesLabour,
    mgmtLabour: mgmtLabourInput,
    opex,
    ownerMarketSalary,
    ownerBucket,
    actualOwnerDrawExpensed,
  } = inputs;

  const directLabour = directLabourInput + (ownerBucket === "direct" ? ownerMarketSalary : 0);
  const mgmtLabour = mgmtLabourInput + (ownerBucket === "management" ? ownerMarketSalary : 0);

  const grossMargin = revenue - directNonLabour;
  const contributionMargin = grossMargin - directLabour;
  const truePretaxProfit = grossMargin - directLabour - salesLabour - mgmtLabour - opex;

  const grossMarginRatio = revenue === 0 ? 0 : grossMargin / revenue;
  const profitBasis: "revenue" | "gross_margin" = grossMarginRatio >= 0.4 ? "revenue" : "gross_margin";
  const basisValue = profitBasis === "revenue" ? revenue : grossMargin;
  const trueProfitPct = basisValue === 0 ? 0 : (truePretaxProfit / basisValue) * 100;

  const ownerDistortion = ownerMarketSalary - actualOwnerDrawExpensed;
  const complianceProfit = truePretaxProfit + ownerMarketSalary - actualOwnerDrawExpensed;

  return { grossMargin, contributionMargin, truePretaxProfit, profitBasis, trueProfitPct, ownerDistortion, complianceProfit };
}
