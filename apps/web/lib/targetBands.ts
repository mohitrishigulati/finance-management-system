/** Colour bands per BLUEPRINT.md §8. Fixed bands for metrics the blueprint gives fixed numbers for; template-relative for the rest. */
export function colourBandsForMetric(metric: string, templateValue: number): { green: number; amber: number } {
  switch (metric) {
    case "runway_days":
      return { green: 60, amber: 30 };
    case "ccc_days":
      return { green: templateValue, amber: templateValue + 15 };
    case "true_profit_pct":
      return { green: 15, amber: 10 };
    case "direct_ler":
    case "mgmt_ler":
    case "sales_ler":
      return { green: templateValue, amber: templateValue * 0.9 };
    case "rona_pct":
      return { green: 30, amber: 20 };
    default:
      return { green: templateValue, amber: templateValue * 0.8 };
  }
}
