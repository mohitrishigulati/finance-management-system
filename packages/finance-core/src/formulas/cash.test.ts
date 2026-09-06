import { describe, expect, it } from "vitest";
import { avgDailyOutflow, coreCapitalFillPct, coreCapitalTarget, monthlyOpexForCoreCapital, runwayDays } from "./cash";
import { meeraFixture } from "../fixtures/meera";

describe("Cash (T2, Meera fixture)", () => {
  const monthlyOpex = monthlyOpexForCoreCapital({
    directNonLabour: meeraFixture.directNonLabour,
    directLabour: meeraFixture.labour.direct.priya,
    salesLabour: meeraFixture.labour.sales,
    mgmtLabour: meeraFixture.labour.management.ritu,
    opex: meeraFixture.opex.total,
    ownerMarketSalary: meeraFixture.company.ownerMarketSalaryMonthly,
  });

  it("computes the monthly opex figure used for core capital", () => {
    expect(monthlyOpex).toBe(meeraFixture.expected.monthlyOpexForCoreCapital);
  });

  it("computes the core capital target as 2x monthly opex", () => {
    expect(coreCapitalTarget(monthlyOpex)).toBe(meeraFixture.expected.coreCapitalTarget);
  });

  it("computes runway in days", () => {
    const daily = avgDailyOutflow(monthlyOpex);
    expect(runwayDays(meeraFixture.bank.operatingBalance, daily)).toBe(meeraFixture.expected.runwayDays);
  });

  it("computes core capital fill pct (Reserve empty -> 0%)", () => {
    const target = coreCapitalTarget(monthlyOpex);
    expect(coreCapitalFillPct(meeraFixture.bank.reserveBalance, target)).toBe(0);
  });
});
