/** DESIGN.md / BLUEPRINT.md §9.9 — colour is direction-aware: some metrics are better higher, some lower. */
export type Colour = "green" | "amber" | "red";
export type Direction = "higher-is-better" | "lower-is-better";

export interface ColourBands {
  direction: Direction;
  green: number;
  amber: number;
}

export function colour(value: number, bands: ColourBands): Colour {
  const { direction, green, amber } = bands;
  if (direction === "higher-is-better") {
    if (value >= green) return "green";
    if (value >= amber) return "amber";
    return "red";
  }
  if (value <= green) return "green";
  if (value <= amber) return "amber";
  return "red";
}

export interface WeeklySnapshotPoint {
  weekEnding: string; // ISO date
  value: number;
}

/** trend_13w arrow: sign of (avg last 4 - avg prior 4). */
export function trendArrow(points: WeeklySnapshotPoint[]): "up" | "down" | "flat" {
  if (points.length < 8) return "flat";
  const last4 = points.slice(-4).map((p) => p.value);
  const prior4 = points.slice(-8, -4).map((p) => p.value);
  const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
  const delta = avg(last4) - avg(prior4);
  if (delta > 0) return "up";
  if (delta < 0) return "down";
  return "flat";
}
