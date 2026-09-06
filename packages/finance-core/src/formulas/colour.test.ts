import { describe, expect, it } from "vitest";
import { colour, trendArrow } from "./colour";

describe("colour bands (BLUEPRINT.md §8)", () => {
  it("runway: green >= 60, amber 30-59, red < 30", () => {
    const bands = { direction: "higher-is-better" as const, green: 60, amber: 30 };
    expect(colour(65, bands)).toBe("green");
    expect(colour(45, bands)).toBe("amber");
    expect(colour(9, bands)).toBe("red");
  });

  it("CCC: lower is better", () => {
    const bands = { direction: "lower-is-better" as const, green: 20, amber: 35 };
    expect(colour(15, bands)).toBe("green");
    expect(colour(30, bands)).toBe("amber");
    expect(colour(67, bands)).toBe("red");
  });
});

describe("trendArrow", () => {
  it("is flat with fewer than 8 points", () => {
    expect(trendArrow([{ weekEnding: "2026-01-01", value: 1 }])).toBe("flat");
  });

  it("points up when the last 4 weeks average higher than the prior 4", () => {
    const points = [10, 10, 10, 10, 20, 20, 20, 20].map((value, i) => ({ weekEnding: `w${i}`, value }));
    expect(trendArrow(points)).toBe("up");
  });
});
