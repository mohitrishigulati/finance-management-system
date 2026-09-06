import { describe, expect, it } from "vitest";
import { gstDueDate, msmeDeadline, isMsmeOverdue, gstLiability } from "./india";
import { meeraFixture } from "../fixtures/meera";

describe("India-specific (T5, T10)", () => {
  it("GST is due the 20th of the following month", () => {
    const due = gstDueDate(new Date(2026, 6, 1)); // July
    expect(due.getMonth()).toBe(7); // August
    expect(due.getDate()).toBe(20);
  });

  it("MSME deadline is delivery + 45 days; billing 1 Jul -> invoice 8 Jul -> deadline 15 Aug window", () => {
    const delivery = new Date(2026, 6, 1);
    const deadline = msmeDeadline(delivery);
    expect(deadline.toISOString().slice(0, 10)).toBe("2026-08-15");
  });

  it("flags an MSME invoice overdue the day after the 45-day clock", () => {
    const delivery = new Date(2026, 6, 1);
    expect(isMsmeOverdue(delivery, new Date(2026, 7, 16), true)).toBe(true);
    expect(isMsmeOverdue(delivery, new Date(2026, 7, 15), true)).toBe(false);
  });

  it("GST liability on the Meera fixture's unpaid corporate invoices", () => {
    expect(gstLiability(meeraFixture.receivables.gstUnpaidOnCorporateInvoices, 0)).toBe(
      meeraFixture.receivables.gstUnpaidOnCorporateInvoices,
    );
  });
});
