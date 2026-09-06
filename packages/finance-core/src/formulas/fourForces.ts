/** FORMULAS.md §9.7 — Four Forces. Advisory only; never moves money itself. */

export interface FourForcesInputs {
  gstLiabilityUnpaid: number;
  advanceTaxInstalmentDue: number;
  tdsShortfall: number;
  cashTax: number;
  debtDrawn: number; // od/card drawn
  truePretaxProfitLastMonth: number;
  coreCapitalTarget: number;
  cashReserve: number;
  taxRate?: number; // fraction, default 0.30
}

export interface FourForcesResult {
  taxDueNext30d: number;
  taxToParkNow: number;
  debtToClear: number;
  reserveGap: number;
  harvestable: number;
}

export function fourForces(inputs: FourForcesInputs): FourForcesResult {
  const {
    gstLiabilityUnpaid,
    advanceTaxInstalmentDue,
    tdsShortfall,
    cashTax,
    debtDrawn,
    truePretaxProfitLastMonth,
    coreCapitalTarget,
    cashReserve,
    taxRate = 0.3,
  } = inputs;

  const taxDueNext30d = gstLiabilityUnpaid + advanceTaxInstalmentDue + tdsShortfall;
  const taxToParkNow = Math.max(0, taxDueNext30d - cashTax);
  const debtToClear = debtDrawn;
  const reserveGap = coreCapitalTarget - cashReserve;
  const harvestable =
    reserveGap <= 0 && debtDrawn === 0 ? Math.max(0, truePretaxProfitLastMonth * (1 - taxRate)) : 0;

  return { taxDueNext30d, taxToParkNow, debtToClear, reserveGap, harvestable };
}
