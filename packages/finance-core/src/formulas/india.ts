/** FORMULAS.md §9.8 — India-specific dates and liabilities. */

const DAY_MS = 24 * 60 * 60 * 1000;

/** GST is payable on invoice date, not receipt date. Due the 20th of the following month (monthly filer). */
export function gstDueDate(invoiceMonth: Date, filer: "monthly" | "qrmp" = "monthly"): Date {
  const year = invoiceMonth.getFullYear();
  const month = invoiceMonth.getMonth();
  const day = filer === "monthly" ? 20 : 22;
  return new Date(year, month + 1, day);
}

/** MSMED Act s.15 / IT Act s.43B(h): buyer must pay an MSME seller within 45 days of delivery. */
export function msmeDeadline(deliveryDate: Date): Date {
  return new Date(deliveryDate.getTime() + 45 * DAY_MS);
}

export function isMsmeOverdue(deliveryDate: Date, asOf: Date, isMsme: boolean): boolean {
  if (!isMsme) return false;
  return asOf.getTime() > msmeDeadline(deliveryDate).getTime();
}

/** Advance tax instalment schedule under s.211: 15 Jun (15%), 15 Sep (45% cum.), 15 Dec (75% cum.), 15 Mar (100%). */
export function advanceTaxSchedule(financialYearStartYear: number): { date: Date; cumulativePct: number }[] {
  return [
    { date: new Date(financialYearStartYear, 5, 15), cumulativePct: 15 },
    { date: new Date(financialYearStartYear, 8, 15), cumulativePct: 45 },
    { date: new Date(financialYearStartYear, 11, 15), cumulativePct: 75 },
    { date: new Date(financialYearStartYear + 1, 2, 15), cumulativePct: 100 },
  ];
}

/** GST liability for a month: output tax on invoices minus input credit on bills, shown separately from cash movement. */
export function gstLiability(outputGstOnInvoices: number, inputCreditOnBills: number): number {
  return outputGstOnInvoices - inputCreditOnBills;
}
