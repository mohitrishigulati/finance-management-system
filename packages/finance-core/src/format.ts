/**
 * Formatters — the India layer (BLUEPRINT.md §9.8 / §19).
 * All money values are integer paise (1 rupee = 100 paise), per the data rule
 * in BLUEPRINT.md §5.3. We keep them as `number` rather than `bigint`: every
 * amount in this system stays far below Number.MAX_SAFE_INTEGER (~9x10^15),
 * and plain numbers keep the formula code free of BigInt arithmetic noise.
 */

export function formatINR(paise: number, opts: { compact?: boolean } = {}): string {
  const rupees = paise / 100;
  const negative = rupees < 0;
  const abs = Math.abs(rupees);

  if (opts.compact) {
    if (abs >= 1_00_00_000) return `${negative ? "−" : ""}₹${trimZeros((abs / 1_00_00_000).toFixed(2))} Cr`;
    if (abs >= 1_00_000) return `${negative ? "−" : ""}₹${trimZeros((abs / 1_00_000).toFixed(1))} L`;
  }

  const [wholePart, fracPart] = abs.toFixed(2).split(".");
  const grouped = indianGroup(wholePart);
  return `${negative ? "−" : ""}₹${grouped}${fracPart === "00" ? "" : `.${fracPart}`}`;
}

function trimZeros(s: string): string {
  return s.replace(/\.?0+$/, "");
}

/** 2-2-3 Indian digit grouping: 123456789 -> "12,34,56,789" */
function indianGroup(digits: string): string {
  if (digits.length <= 3) return digits;
  const last3 = digits.slice(-3);
  let rest = digits.slice(0, -3);
  const parts: string[] = [];
  while (rest.length > 2) {
    parts.unshift(rest.slice(-2));
    rest = rest.slice(0, -2);
  }
  if (rest.length > 0) parts.unshift(rest);
  return `${parts.join(",")},${last3}`;
}

const MONTHS_IN = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/** "23 Aug 2026" */
export function formatDateIN(date: Date): string {
  return `${date.getDate()} ${MONTHS_IN[date.getMonth()]} ${date.getFullYear()}`;
}

/** FY runs fyStartMonth (default April, 1-indexed=4) to fyStartMonth+11. "FY26-27" for Apr 2026-Mar 2027. */
export function fyLabel(date: Date, fyStartMonth = 4): string {
  const { startYear, endYear } = fiscalYearBounds(date, fyStartMonth);
  return `FY${String(startYear).slice(-2)}-${String(endYear).slice(-2)}`;
}

/** "Q2 FY27" for Jul-Sep 2026 (FY26-27), quarters counted from fyStartMonth. */
export function quarterLabel(date: Date, fyStartMonth = 4): string {
  const { startYear, endYear } = fiscalYearBounds(date, fyStartMonth);
  const monthIndex0 = date.getMonth(); // 0-11
  const fyStartIndex0 = fyStartMonth - 1;
  const monthsSinceFyStart = (monthIndex0 - fyStartIndex0 + 12) % 12;
  const quarter = Math.floor(monthsSinceFyStart / 3) + 1;
  void startYear;
  return `Q${quarter} FY${String(endYear).slice(-2)}`;
}

function fiscalYearBounds(date: Date, fyStartMonth: number): { startYear: number; endYear: number } {
  const year = date.getFullYear();
  const monthIndex0 = date.getMonth(); // 0-11
  const fyStartIndex0 = fyStartMonth - 1;
  if (monthIndex0 >= fyStartIndex0) {
    return { startYear: year, endYear: year + 1 };
  }
  return { startYear: year - 1, endYear: year };
}
