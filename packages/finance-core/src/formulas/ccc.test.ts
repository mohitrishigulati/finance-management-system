import { describe, expect, it } from "vitest";
import { cashConversionCycle, median, weightedCcc } from "./ccc";
import { meeraFixture } from "../fixtures/meera";

describe("Cash Conversion Cycle (Meera fixture)", () => {
  it("computes the median of billing days from delivery to invoice", () => {
    expect(median([5, 7, 9])).toBe(7);
    expect(median([5, 7])).toBe(6);
  });

  it("corporate stream CCC ~= 67 days (billing + payment, no inventory, payable 0)", () => {
    const ccc = cashConversionCycle({ billingDays: 7, paymentDays: 60, payableDays: 0 });
    expect(ccc).toBe(67);
  });

  it("individual (prepaid) stream CCC = 0 days", () => {
    const ccc = cashConversionCycle({ billingDays: 0, paymentDays: 0, payableDays: 0 });
    expect(ccc).toBe(0);
  });

  it("weights CCC across streams by revenue share", () => {
    const w = weightedCcc([
      { name: "individual", annualRevenue: meeraFixture.cccByStream.individual.annualRevenue, cccDays: 0 },
      { name: "corporate", annualRevenue: meeraFixture.cccByStream.corporate.annualRevenue, cccDays: 67 },
    ]);
    // individual is 270k/420k = 64.3%, corporate 150k/420k = 35.7% of revenue
    expect(w).toBeCloseTo((150_000 / 420_000) * 67, 1);
  });
});
