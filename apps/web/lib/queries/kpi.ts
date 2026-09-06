import { withCompanyContext } from "@/lib/db";
import { computeCashSnapshot, type CashSnapshot } from "./aggregates";

export interface CashTodayEmpty {
  empty: true;
  companyName: string;
}

export type CashTodayReady = { empty: false; companyName: string } & CashSnapshot;

export async function getCashToday(userId: string): Promise<CashTodayEmpty | CashTodayReady> {
  return withCompanyContext(userId, async (client) => {
    const companyRes = await client.query(
      `select c.* from company c join app_user u on u.company_id = c.id where u.id = $1`,
      [userId],
    );
    const company = companyRes.rows[0];

    const txnCountRes = await client.query(
      `select count(*)::int as n from transaction where company_id = $1 and deleted_at is null`,
      [company.id],
    );
    if (txnCountRes.rows[0].n === 0) {
      return { empty: true, companyName: company.name };
    }

    const snapshot = await computeCashSnapshot(client, company);
    return { empty: false, companyName: company.name, ...snapshot };
  });
}
