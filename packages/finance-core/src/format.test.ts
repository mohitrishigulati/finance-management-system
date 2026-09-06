import { describe, expect, it } from "vitest";
import { formatINR, fyLabel, quarterLabel, formatDateIN } from "./format";

describe("formatINR (T0)", () => {
  it("formats paise with 2-2-3 Indian grouping and decimals", () => {
    expect(formatINR(123456789)).toBe("₹12,34,567.89");
  });

  it("drops .00 for whole rupee amounts", () => {
    expect(formatINR(12_34_567 * 100)).toBe("₹12,34,567");
  });

  it("groups small amounts without a leading comma group", () => {
    expect(formatINR(999 * 100)).toBe("₹999");
    expect(formatINR(1234 * 100)).toBe("₹1,234");
  });

  it("marks negative amounts with a leading minus, never colour", () => {
    expect(formatINR(-500 * 100)).toBe("−₹500");
  });

  it("supports compact lakh/crore display", () => {
    expect(formatINR(4_20_000 * 100, { compact: true })).toBe("₹4.2 L");
    expect(formatINR(1_23_00_000 * 100, { compact: true })).toBe("₹1.23 Cr");
  });
});

describe("fyLabel / quarterLabel (T0)", () => {
  it("labels the fiscal year Apr-Mar", () => {
    expect(fyLabel(new Date(2026, 6, 15))).toBe("FY26-27"); // Jul 2026
    expect(fyLabel(new Date(2026, 1, 15))).toBe("FY25-26"); // Feb 2026 -> previous FY
  });

  it("labels the quarter within the fiscal year", () => {
    expect(quarterLabel(new Date(2026, 7, 23))).toBe("Q2 FY27"); // Aug 2026
    expect(quarterLabel(new Date(2026, 3, 1))).toBe("Q1 FY27"); // Apr 2026
    expect(quarterLabel(new Date(2027, 1, 1))).toBe("Q4 FY27"); // Feb 2027
  });
});

describe("formatDateIN", () => {
  it("formats as D MMM YYYY", () => {
    expect(formatDateIN(new Date(2026, 7, 23))).toBe("23 Aug 2026");
  });
});
