import { describe, expect, it } from "vitest";
import { directLER, mgmtLER, revenueNeededForTargetProfitPct } from "./labour";
import { trueProfit } from "./profit";
import { meeraFixture } from "../fixtures/meera";

describe("Labour Efficiency Ratios (T8, Meera fixture)", () => {
  const profit = trueProfit({
    revenue: meeraFixture.revenue.total,
    directNonLabour: meeraFixture.directNonLabour,
    directLabour: meeraFixture.labour.direct.priya,
    salesLabour: meeraFixture.labour.sales,
    mgmtLabour: meeraFixture.labour.management.ritu,
    opex: meeraFixture.opex.total,
    ownerMarketSalary: meeraFixture.company.ownerMarketSalaryMonthly,
    ownerBucket: meeraFixture.company.ownerBucket,
    actualOwnerDrawExpensed: 0,
  });

  const directLabourWithOwner = meeraFixture.labour.direct.priya + meeraFixture.company.ownerMarketSalaryMonthly;

  it("computes direct LER 1.71", () => {
    const ler = directLER(profit.grossMargin, directLabourWithOwner)!;
    expect(Math.round(ler * 100) / 100).toBe(meeraFixture.expected.directLER);
  });

  it("computes management LER 6.8", () => {
    const ler = mgmtLER(profit.contributionMargin, meeraFixture.labour.management.ritu)!;
    expect(Math.round(ler * 10) / 10).toBe(meeraFixture.expected.mgmtLER);
  });

  it("computes revenue needed for 15% true profit (~₹4.36L)", () => {
    const grossMarginRatio = profit.grossMargin / meeraFixture.revenue.total;
    const fixedCosts = directLabourWithOwner + meeraFixture.labour.management.ritu + meeraFixture.opex.total;
    const revenueNeeded = revenueNeededForTargetProfitPct({ grossMarginRatio, fixedCosts, targetPct: 15 });
    expect(Math.abs(revenueNeeded - meeraFixture.expected.revenueNeededFor15pct)).toBeLessThan(5000 * 100);
  });
});
