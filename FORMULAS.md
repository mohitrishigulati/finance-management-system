# FORMULAS.md — exact definitions

Extracted from `BLUEPRINT.md` Section 9. This is the source of truth for MATH — every value below must be implemented once in `packages/finance-core/src/formulas/*.ts` with unit tests, and never re-implemented in a screen or edge function.

All amounts in paise; all periods aligned to Indian FY (April–March). "Month" = calendar month unless stated.

## 9.1 Cash
```
cash_operating = Σ balance of bank_accounts where bucket = operating
cash_all       = Σ balance of bucket in (operating, tax, reserve)
debt           = Σ drawn of bucket in (od, card) + Σ term_loan_outstanding (if tracked)

avg_daily_outflow = (Σ debits in last 90 days
                     excluding transfers between own accounts, loan principal, capex,
                     owner_draw above market salary)
                    / 90
   + owner_market_salary_monthly / 30   (if the owner is not actually drawing it yet)

runway_days = floor(cash_operating / avg_daily_outflow)

monthly_opex_for_core_capital = average over last 3 months of
      (direct_labour + sales_labour + mgmt_labour + opex + owner_market_salary)
      -- i.e. every recurring cost you do NOT get credit terms on; exclude COGS bought on terms
core_capital_target = 2 × monthly_opex_for_core_capital
core_capital_fill_pct = cash_reserve / core_capital_target × 100
```

## 9.2 Cash Conversion Cycle
Computed on receivables actually observed in the last 90 days; segment days are medians, not means (outliers hide the truth).
```
selling_days     = median(order_date − first_contact_date)          -- optional, only if CRM data exists
delivery_days    = median(delivery_date − order_date)              -- optional
billing_days     = median(invoice_date − delivery_date)            -- REQUIRED; most fixable
payment_days     = median(paid_date − invoice_date)                -- REQUIRED (DSO)
payable_days     = median(paid_date − bill_date)                   -- from bills
inventory_days   = avg_inventory / (COGS / 365)                    -- only if template has inventory

CCC = delivery_days + billing_days + payment_days + inventory_days − payable_days
      (missing optional segments count as 0 and are flagged "not measured")

cash_per_ccc_day = (annual revenue / 365) × (working_capital_pct)  -- ₹ freed per day of CCC improvement
```
Also report the **weighted CCC by revenue stream** when the template has streams (e.g. retail UPI at −0 days vs corporate invoices at 67 days).

## 9.3 True Profit (Simple Numbers)
```
revenue              = Σ category.group = revenue (accrual: by invoice_date when invoices exist; else by bank credit)
direct_nonlabour     = Σ category.group = direct_nonlabour   (materials, subcontractors, gateway fees, pass-through)
gross_margin         = revenue − direct_nonlabour            -- THE internal top line

direct_labour        = labour_cost[bucket=direct]  (+ owner_market_salary if owner is direct)
sales_labour         = labour_cost[bucket=sales]
mgmt_labour          = labour_cost[bucket=management] (+ owner_market_salary if owner is management)
opex                 = Σ category.group = opex (rent, ads, tools, travel, professional fees...)

contribution_margin  = gross_margin − direct_labour
true_pretax_profit   = gross_margin − direct_labour − sales_labour − mgmt_labour − opex

profit_basis         = revenue                  if gross_margin / revenue ≥ 40%
                     = gross_margin             otherwise
true_profit_pct      = true_pretax_profit / profit_basis × 100

owner_distortion     = owner_market_salary − actual owner draw (shown to the owner every month)
compliance_profit    = true_pretax_profit + owner_market_salary − actual_owner_draw_expensed   -- bridge for the CA
```
Owner draw transactions (`category.group = owner_draw`) are **excluded** from P&L; the market salary from Setup replaces them.

## 9.4 Labour Efficiency Ratios
```
direct_LER = gross_margin / direct_labour
sales_LER  = contribution_margin / sales_labour           (null if no sales labour)
mgmt_LER   = contribution_margin / mgmt_labour
LER_at_last_15pct = the LER values in the most recent month where true_profit_pct ≥ 15 (stored as targets)
hiring_signal = "hold costs" if true_profit_pct < 15
              = "may add labour down to 10%" if true_profit_pct ≥ 15
revenue_needed_for_15pct = solve for R: (GM_ratio × R) − fixed_costs = 0.15 × R   (GM_ratio = gross_margin/revenue)
```

## 9.5 Power of One (7 levers), trailing-12-month basis
```
price_1pct        = revenue_ttm × 1%                                  → profit & cash
volume_1pct       = gross_margin_ttm × 1% − (working_capital_pct × revenue_ttm × 1%)   → profit; cash net of WC
direct_cost_1pct  = (direct_nonlabour_ttm + direct_labour_ttm) × 1%   → profit & cash
opex_1pct         = (opex_ttm + sales_labour + mgmt_labour) × 1%      → profit & cash
ar_1day           = revenue_ttm / 365                                 → cash, one-time
inventory_1day    = COGS_ttm / 365                                    → cash, one-time (0 if no inventory)
ap_1day           = (direct_nonlabour_ttm + opex_ttm) / 365           → cash, one-time
total_power_of_one_cash = Σ cash effects;  total_profit = Σ profit effects
```
Screen shows each lever sorted by ₹ impact, with a slider for the owner's own combination (e.g. price +5%, AR −20 days) and the resulting cash and profit.

## 9.6 Balance-sheet view (banker's lens) — computed when data exists
```
working_capital      = accounts_receivable + inventory − accounts_payable
working_capital_pct  = working_capital / revenue_ttm × 100
gross_margin_pct     = gross_margin / revenue × 100
growing_broke_flag   = working_capital_pct > gross_margin_pct          -- every sale drains cash
net_operating_assets = working_capital + fixed_assets (from Setup or capex Σ)
RONA                 = EBIT_ttm / net_operating_assets × 100            (EBIT = true_pretax_profit + interest)
asset_turnover       = revenue_ttm / net_operating_assets
operating_cash_flow  = EBITDA − Δworking_capital  (period)
```

## 9.7 Four Forces (allocation engine — advisory only, never moves money)
```
Force 1 tax_due_next_30d   = GST_liability_unpaid + advance_tax_installment_due + TDS_shortfall
        tax_to_park_now    = tax_due_next_30d − cash_tax
Force 2 debt_to_clear      = Σ od/card drawn   (recommend paying from operating surplus only when true_profit_pct > 0)
Force 3 reserve_gap        = core_capital_target − cash_reserve
Force 4 harvestable        = max(0, true_pretax_profit_last_month × (1 − tax_rate)) if reserve_gap ≤ 0 and debt = 0 else 0
Monday message renders these as "Move ₹X to Tax · Pay ₹Y on card · Move ₹Z to Reserve · Harvest: not yet (Reserve 21%)".
```

## 9.8 India-specific
```
GST_liability(month) = Σ invoice.gst_amount where invoice_date in month
                       − Σ bill.gst_amount (input credit) where bill_date in month     -- shown as "output − input; confirm with CA"
GST due date          = 20th of following month (monthly filer) — configurable (QRMP: 22nd/24th)
TDS_receivable        = Σ invoice.tds_expected_amount where paid and tds_deducted;  reconcile flag vs 26AS upload (SHOULD)
advance_tax_dates     = 15 Jun (15%), 15 Sep (45% cum.), 15 Dec (75% cum.), 15 Mar (100%)
msme_deadline         = delivery_date + 45 days (if company.is_msme and party is a buyer); overdue → red + "43B(h)" tag on reminder
FY label              = "FY26-27" for Apr 2026–Mar 2027; quarter label "Q2 FY27" (Jul–Sep 2026)
formatINR(paise)      = "₹12,34,567" (2-2-3 grouping); ≥ 1,00,00,000 may show "₹1.23 Cr" in compact mode; lakh shorthand "₹4.2 L"
```

## 9.9 Colour
```
colour(metric, value, target) → green | amber | red by bands in Section 8 of BLUEPRINT.md; direction-aware (higher-is-better vs lower-is-better).
trend_13w = last 13 weekly snapshot values; arrow = sign of (avg last 4 − avg prior 4).
```

---

## Known formula gaps flagged for interrogation (see docs/DECISIONS.md)

- **9.1 `avg_daily_outflow`** adds the *full* `owner_market_salary_monthly / 30` whenever the owner "is not actually drawing it yet," but the exclusion clause only strips `owner_draw` *above* market salary. A partial draw (owner takes half their market salary some months) is not handled — the formula should add only the **shortfall** (`max(0, owner_market_salary_monthly − actual_owner_draw_this_month) / 30`), not a binary full/zero addition, to avoid double-counting or under-counting outflow.
- **9.3 accrual/cash mismatch** — revenue is accrual (by invoice date), but `direct_nonlabour` and `opex` are implicitly cash/bank-category based. A single large annual prepayment (e.g. yearly software licence) will spike one month's profit calculation. Acceptable for v1 as a documented limitation; a SHOULD-later improvement is to accrue/amortise recurring non-labour costs the same way revenue is accrued.
- **9.1 `monthly_opex_for_core_capital` includes direct non-labour costs**, contrary to the literal formula text ("exclude COGS bought on terms"). The Meera fixture's own ₹3,70,000 figure (BLUEPRINT.md Layer 1 box) includes her ₹10,000 gateway/materials line — a cost paid instantly, not on supplier credit. v1 has no field distinguishing "COGS bought on terms" (which should stay excluded, since a supplier's credit period already covers it) from "non-labour direct costs paid immediately" (which should count, since the business must still find that cash monthly). Implemented in `finance-core` as: `directNonLabour + directLabour + salesLabour + mgmtLabour + opex + ownerShortfall`. A `category.is_on_terms` flag to exclude true trade-credit COGS is a SHOULD-later refinement.
