import type { PoolClient } from "pg";
import {
  avgDailyOutflow,
  colour,
  coreCapitalFillPct,
  coreCapitalTarget,
  monthlyOpexForCoreCapital,
  runwayDays,
} from "@finance-os/finance-core";

/**
 * Shared aggregation queries — used both by the per-request, RLS-scoped
 * Cash Today screen (lib/queries/kpi.ts, via withCompanyContext) and by the
 * cross-tenant daily message job (app/api/cron/daily-cash-message), which
 * runs on the admin pool the same way a Supabase Edge Function would run
 * with the service_role key. Either caller passes in its own `client`; the
 * SQL and formulas are written once here per CLAUDE.md.
 */

export async function bucketBalance(client: PoolClient, companyId: string, bucket: string): Promise<number> {
  const { rows } = await client.query(
    `select coalesce(sum(ba.opening_balance), 0)
       + coalesce((select sum(t.amount) from transaction t
                    join bank_account b2 on b2.id = t.bank_account_id
                    where b2.company_id = $1 and b2.bucket = $2 and t.deleted_at is null), 0) as balance
     from bank_account ba
     where ba.company_id = $1 and ba.bucket = $2 and ba.deleted_at is null`,
    [companyId, bucket],
  );
  return Number(rows[0]?.balance ?? 0);
}

export async function monthlyGroupSum(client: PoolClient, companyId: string, month: string, group: string): Promise<number> {
  const { rows } = await client.query(
    `select coalesce(sum(-t.amount), 0) as total
       from transaction t
       join category c on c.id = t.category_id
      where t.company_id = $1 and c."group" = $2 and to_char(t.txn_date, 'YYYY-MM') = $3
        and t.deleted_at is null and t.amount < 0`,
    [companyId, group, month],
  );
  return Number(rows[0]?.total ?? 0);
}

export async function labourSum(client: PoolClient, companyId: string, month: string, bucket: string): Promise<number> {
  const { rows } = await client.query(
    `select coalesce(sum(amount), 0) as total from labour_cost where company_id = $1 and month = $2 and bucket = $3`,
    [companyId, month, bucket],
  );
  return Number(rows[0]?.total ?? 0);
}

export interface CashSnapshot {
  operatingBalancePaise: number;
  taxBalancePaise: number;
  reserveBalancePaise: number;
  runwayDays: number;
  runwayColour: "green" | "amber" | "red";
  coreCapitalTargetPaise: number;
  coreCapitalGapPaise: number;
  coreCapitalFillPct: number;
  overdueReceivablesPaise: number;
  overdueReceivablesCount: number;
  todayInPaise: number;
  todayOutPaise: number;
}

export async function computeCashSnapshot(
  client: PoolClient,
  company: { id: string; owner_market_salary_monthly: number },
): Promise<CashSnapshot> {
  const month = new Date().toISOString().slice(0, 7);

  // A single pg Client/PoolClient processes queries one at a time over one
  // connection — Promise.all on the *same* client just queues them and
  // triggers pg's "already executing a query" deprecation warning, with no
  // real concurrency gained. Sequential awaits here are simpler and correct.
  const operating = await bucketBalance(client, company.id, "operating");
  const tax = await bucketBalance(client, company.id, "tax");
  const reserve = await bucketBalance(client, company.id, "reserve");

  const directNonLabour = await monthlyGroupSum(client, company.id, month, "direct_nonlabour");
  const opex = await monthlyGroupSum(client, company.id, month, "opex");
  const directLabour = await labourSum(client, company.id, month, "direct");
  const salesLabour = await labourSum(client, company.id, month, "sales");
  const mgmtLabour = await labourSum(client, company.id, month, "management");

  const monthlyOpex = monthlyOpexForCoreCapital({
    directNonLabour,
    directLabour,
    salesLabour,
    mgmtLabour,
    opex,
    ownerMarketSalary: company.owner_market_salary_monthly,
  });
  const daily = avgDailyOutflow(monthlyOpex);
  const runway = runwayDays(operating, daily);
  const ccTarget = coreCapitalTarget(monthlyOpex);

  const overdueRes = await client.query(
    `select coalesce(sum(total_amount - amount_received), 0) as amt, count(*)::int as n
       from invoice
      where company_id = $1 and status not in ('paid','written_off') and due_date < current_date`,
    [company.id],
  );

  const todayRes = await client.query(
    `select coalesce(sum(amount) filter (where amount > 0), 0) as in_amt,
            coalesce(sum(-amount) filter (where amount < 0), 0) as out_amt
       from transaction where company_id = $1 and txn_date = current_date and deleted_at is null`,
    [company.id],
  );

  return {
    operatingBalancePaise: operating,
    taxBalancePaise: tax,
    reserveBalancePaise: reserve,
    runwayDays: runway,
    runwayColour: colour(runway, { direction: "higher-is-better", green: 60, amber: 30 }),
    coreCapitalTargetPaise: ccTarget,
    coreCapitalGapPaise: Math.max(0, ccTarget - reserve),
    coreCapitalFillPct: coreCapitalFillPct(reserve, ccTarget),
    overdueReceivablesPaise: Number(overdueRes.rows[0].amt),
    overdueReceivablesCount: Number(overdueRes.rows[0].n),
    todayInPaise: Number(todayRes.rows[0].in_amt),
    todayOutPaise: Number(todayRes.rows[0].out_amt),
  };
}
