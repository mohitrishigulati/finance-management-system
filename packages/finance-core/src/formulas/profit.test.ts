import { describe, expect, it } from "vitest";
import { trueProfit } from "./profit";
import { meeraFixture } from "../fixtures/meera";

describe("True profit (T7, Meera fixture)", () => {
  const result = trueProfit({
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

  it("computes gross margin as the internal top line", () => {
    expect(result.grossMargin).toBe(meeraFixture.expected.grossMargin);
  });

  it("computes true pretax profit after the owner's market salary", () => {
    expect(result.truePretaxProfit).toBe(meeraFixture.expected.truePretaxProfit);
  });

  it("picks revenue as the profit basis (gross margin >= 40% of revenue)", () => {
    expect(result.profitBasis).toBe("revenue");
  });

  it("computes true profit % ~= 12%", () => {
    expect(Math.round(result.trueProfitPct)).toBe(meeraFixture.expected.truePretaxProfitPct);
  });

  it("computes the owner distortion and compliance-book bridge", () => {
    expect(result.ownerDistortion).toBe(meeraFixture.expected.ownerDistortion);
    expect(result.complianceProfit).toBe(meeraFixture.expected.complianceProfit);
  });
});
