import { describe, expect, it } from "vitest";
import { powerOfOne } from "./powerOfOne";
import { meeraFixture } from "../fixtures/meera";

describe("Power of One (T9, Meera fixture, annualised)", () => {
  const revenueTtm = meeraFixture.revenue.total * 12;
  const directLabourTtm = (meeraFixture.labour.direct.priya + meeraFixture.company.ownerMarketSalaryMonthly) * 12;
  const grossMarginTtm = (meeraFixture.revenue.total - meeraFixture.directNonLabour) * 12;

  const { levers, totalCash } = powerOfOne({
    revenueTtm,
    grossMarginTtm,
    directNonLabourTtm: meeraFixture.directNonLabour * 12,
    directLabourTtm,
    opexTtm: meeraFixture.opex.total * 12,
    salesLabourTtm: 0,
    mgmtLabourTtm: meeraFixture.labour.management.ritu * 12,
    workingCapitalPct: 0.1,
    hasInventory: false,
  });

  it("price 1% = ₹50,400 annually", () => {
    const price = levers.find((l) => l.lever === "price")!;
    expect(price.cashImpact).toBe(meeraFixture.expected.powerOfOne.price1pctAnnual);
  });

  it("blended AR 1 day ~= ₹13,800 annually", () => {
    const ar = levers.find((l) => l.lever === "receivable_days")!;
    expect(Math.abs(ar.cashImpact - meeraFixture.expected.powerOfOne.arBlended1dayAnnual)).toBeLessThan(2000 * 100);
  });

  it("sorts levers by cash impact descending", () => {
    for (let i = 1; i < levers.length; i++) {
      expect(levers[i - 1].cashImpact).toBeGreaterThanOrEqual(levers[i].cashImpact);
    }
  });

  it("totals the cash impact across all seven levers", () => {
    const sum = levers.reduce((s, l) => s + l.cashImpact, 0);
    expect(totalCash).toBeCloseTo(sum, 5);
  });
});
