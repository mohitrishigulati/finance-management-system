import { NextResponse } from "next/server";
import { getAdminPool } from "@/lib/db";
import { computeCashSnapshot } from "@/lib/queries/aggregates";
import { renderDailyCashMessage } from "@/lib/messages/dailyCash";
import { sendWhatsAppMessage } from "@/lib/whatsapp";

/**
 * Daily 6pm cash message (BLUEPRINT.md §3 step 7, §11, acceptance test T3).
 * In production this is a scheduled Supabase Edge Function / pg_cron job; in
 * dev (no real Supabase project yet, per docs/DECISIONS.md) it's a plain
 * route handler you call yourself or point a system cron at. Idempotent per
 * company per day: a second call the same day sends nothing (T3).
 */
export async function GET() {
  const pool = getAdminPool();
  const client = await pool.connect();
  const sent: string[] = [];
  const skipped: string[] = [];

  try {
    const companies = await client.query(`select id, name, owner_market_salary_monthly from company`);

    for (const company of companies.rows) {
      const users = await client.query(
        `select id, name, phone_whatsapp from app_user where company_id = $1 and notify_daily = true`,
        [company.id],
      );

      for (const user of users.rows) {
        const already = await client.query(
          `select 1 from message_log
            where company_id = $1 and to_user_id = $2 and template = 'daily_cash'
              and created_at::date = current_date`,
          [company.id, user.id],
        );
        if (already.rows.length > 0) {
          skipped.push(`${company.name}/${user.name}`);
          continue;
        }

        const snapshot = await computeCashSnapshot(client, company);
        const body = renderDailyCashMessage(company.name, snapshot);
        const result = await sendWhatsAppMessage(user.phone_whatsapp, body);

        await client.query(
          `insert into message_log (company_id, to_user_id, channel, template, rendered_body, sent_at, status, provider_message_id)
           values ($1,$2,'whatsapp','daily_cash',$3, now(), $4, $5)`,
          [company.id, user.id, body, result.status, result.providerMessageId ?? null],
        );
        sent.push(`${company.name}/${user.name}`);
      }
    }

    return NextResponse.json({ sent, skipped });
  } finally {
    client.release();
  }
}
