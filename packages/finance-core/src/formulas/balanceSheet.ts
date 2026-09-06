/** FORMULAS.md §9.6 — Balance-sheet view (banker's lens). Computed only when the data exists. */

export interface BalanceSheetInputs {
  accountsReceivable: number;
  inventory: number;
  accountsPayable: number;
  revenueTtm: number;
  grossMargin: number;
  revenue: number;
  fixedAssets: number;
  truePretaxProfitTtm: number;
  interestTtm?: number;
}

export interface BalanceSheetResult {
  workingCapital: number;
  workingCapitalPct: number;
  grossMarginPct: number;
  growingBrokeFlag: boolean;
  netOperatingAssets: number;
  rona: number;
  assetTurnover: number;
}

export function balanceSheetView(inputs: BalanceSheetInputs): BalanceSheetResult {
  const {
    accountsReceivable,
    inventory,
    accountsPayable,
    revenueTtm,
    grossMargin,
    revenue,
    fixedAssets,
    truePretaxProfitTtm,
    interestTtm = 0,
  } = inputs;

  const workingCapital = accountsReceivable + inventory - accountsPayable;
  const workingCapitalPct = revenueTtm === 0 ? 0 : (workingCapital / revenueTtm) * 100;
  const grossMarginPct = revenue === 0 ? 0 : (grossMargin / revenue) * 100;
  const growingBrokeFlag = workingCapitalPct > grossMarginPct;
  const netOperatingAssets = workingCapital + fixedAssets;
  const ebit = truePretaxProfitTtm + interestTtm;
  const rona = netOperatingAssets === 0 ? 0 : (ebit / netOperatingAssets) * 100;
  const assetTurnover = netOperatingAssets === 0 ? 0 : revenueTtm / netOperatingAssets;

  return { workingCapital, workingCapitalPct, grossMarginPct, growingBrokeFlag, netOperatingAssets, rona, assetTurnover };
}
