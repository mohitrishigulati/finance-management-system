/** FORMULAS.md §9.2 — Cash Conversion Cycle. Segment days are medians, not means. */

export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

export interface CccSegments {
  sellingDays?: number;
  deliveryDays?: number;
  billingDays: number;
  paymentDays: number;
  payableDays: number;
  inventoryDays?: number;
}

export function cashConversionCycle(segments: CccSegments): number {
  const { deliveryDays = 0, billingDays, paymentDays, inventoryDays = 0, payableDays } = segments;
  return deliveryDays + billingDays + paymentDays + inventoryDays - payableDays;
}

/** Rupees freed per one day of CCC improvement. */
export function cashPerCccDay(annualRevenue: number, workingCapitalPct: number): number {
  return (annualRevenue / 365) * workingCapitalPct;
}

export interface RevenueStreamCcc {
  name: string;
  annualRevenue: number;
  cccDays: number;
}

/** Weighted CCC across revenue streams, weighted by each stream's share of revenue. */
export function weightedCcc(streams: RevenueStreamCcc[]): number {
  const total = streams.reduce((sum, s) => sum + s.annualRevenue, 0);
  if (total === 0) return 0;
  return streams.reduce((sum, s) => sum + s.cccDays * (s.annualRevenue / total), 0);
}
