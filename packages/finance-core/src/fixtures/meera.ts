/**
 * The Meera fixture — BLUEPRINT.md §18. Seed data shared by finance-core unit
 * tests, the acceptance tests in tests/, and the `pnpm db:seed:meera` script.
 * All money in paise (rupees * 100), per the data rule in BLUEPRINT.md §5.3.
 */

const RUPEE = 100;

export const meeraFixture = {
  company: {
    name: "Meera Coaching",
    industryTemplate: "coaching-services",
    ownerMarketSalaryMonthly: 1_80_000 * RUPEE,
    ownerBucket: "direct" as const,
  },
  revenue: {
    individualPrepaid: 2_70_000 * RUPEE,
    corporateInvoiced: 1_50_000 * RUPEE,
    total: 4_20_000 * RUPEE,
  },
  directNonLabour: 10_000 * RUPEE, // gateway 2%, Zoom, materials
  labour: {
    direct: { priya: 60_000 * RUPEE }, // + owner market salary, added by the formula
    sales: 0,
    management: { ritu: 25_000 * RUPEE },
  },
  opex: {
    metaAds: 50_000 * RUPEE,
    rentToolsSoftware: 30_000 * RUPEE,
    misc: 15_000 * RUPEE,
    total: 95_000 * RUPEE,
  },
  bank: {
    operatingBalance: 1_10_000 * RUPEE,
    taxBalance: 0,
    reserveBalance: 0,
    creditCardDrawn: 50_000 * RUPEE,
  },
  receivables: {
    outstandingTotal: 3_00_000 * RUPEE,
    invoices: [
      { ageingDays: 40, amount: 1_50_000 * RUPEE, party: "Corporate client A" },
      { ageingDays: 61, amount: 1_50_000 * RUPEE, party: "Corporate client B" },
    ],
    gstUnpaidOnCorporateInvoices: 27_000 * RUPEE,
    tdsSection: "194J",
    tdsRatePct: 10,
  },
  cccByStream: {
    individual: { annualRevenue: 2_70_000 * RUPEE * 12, cccDays: 0 },
    corporate: { annualRevenue: 1_50_000 * RUPEE * 12, cccDays: 67 },
  },
  expected: {
    monthlyOpexForCoreCapital: 3_70_000 * RUPEE,
    coreCapitalTarget: 7_40_000 * RUPEE,
    runwayDays: 9,
    grossMargin: 4_10_000 * RUPEE,
    truePretaxProfit: 50_000 * RUPEE,
    truePretaxProfitPct: 12, // rounded; exact ~11.9048%
    complianceProfit: 2_30_000 * RUPEE,
    ownerDistortion: 1_80_000 * RUPEE,
    directLER: 1.71,
    mgmtLER: 6.8,
    revenueNeededFor15pct: 4_36_000 * RUPEE, // approx, per T8
    powerOfOne: {
      price1pctAnnual: 50_400 * RUPEE,
      arBlended1dayAnnual: 13_800 * RUPEE, // approx
    },
  },
};

export type MeeraFixture = typeof meeraFixture;
