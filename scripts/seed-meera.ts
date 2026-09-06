// Seeds the Meera fixture (BLUEPRINT.md §18) directly into the dev database,
// bypassing the Setup wizard UI — this represents "a quarter already live,"
// used for the acceptance tests (T2, T3) and for manually exercising the
// screens. Run with `pnpm db:seed:meera`.
import "dotenv/config";
import pg from "pg";
import { meeraFixture } from "@finance-os/finance-core/src/fixtures/meera";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL_MIGRATOR });

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

async function main() {
  const client = await pool.connect();
  try {
    await client.query("begin");

    const existing = await client.query(`select id from company where name = $1`, [meeraFixture.company.name]);
    if (existing.rows.length > 0) {
      console.log(`"${meeraFixture.company.name}" already seeded (id=${existing.rows[0].id}). Delete it first to reseed.`);
      await client.query("rollback");
      return;
    }

    const companyRes = await client.query(
      `insert into company (name, legal_name, industry_template, is_msme, udyam_no, owner_market_salary_monthly, owner_bucket)
       values ($1,$1,$2,true,'UDYAM-DEV-0000001',$3,$4) returning id`,
      [meeraFixture.company.name, meeraFixture.company.industryTemplate, meeraFixture.company.ownerMarketSalaryMonthly, meeraFixture.company.ownerBucket],
    );
    const companyId: string = companyRes.rows[0].id;

    const userRes = await client.query(
      `insert into app_user (company_id, name, phone_whatsapp, roles) values ($1,'Meera','+919900000001',array['owner','ops']::user_role[]) returning id`,
      [companyId],
    );
    const userId: string = userRes.rows[0].id;

    // bank_account.opening_balance + all transactions on it = current balance.
    // The fixture's ₹1,10,000 operating balance is the *current* (observed)
    // balance, already reflecting this month's revenue/expense transactions
    // seeded below — so opening_balance must be backed out by their net
    // effect, not set to ₹1,10,000 directly (which would double-count them).
    const netOperatingTxnEffect =
      meeraFixture.revenue.individualPrepaid -
      meeraFixture.directNonLabour -
      meeraFixture.opex.total -
      meeraFixture.labour.direct.priya -
      meeraFixture.labour.management.ritu;

    const accounts: Record<string, string> = {};
    for (const [bucket, balance] of [
      ["operating", meeraFixture.bank.operatingBalance - netOperatingTxnEffect],
      ["tax", meeraFixture.bank.taxBalance],
      ["reserve", meeraFixture.bank.reserveBalance],
    ] as const) {
      const res = await client.query(
        `insert into bank_account (company_id, name, bucket, opening_balance) values ($1,$2,$3,$4) returning id`,
        [companyId, `${bucket[0].toUpperCase()}${bucket.slice(1)}`, bucket, balance],
      );
      accounts[bucket] = res.rows[0].id;
    }
    const cardRes = await client.query(
      `insert into bank_account (company_id, name, bucket, opening_balance) values ($1,'Credit card','card',$2) returning id`,
      [companyId, -meeraFixture.bank.creditCardDrawn],
    );
    accounts.card = cardRes.rows[0].id;

    const categorySeed: { name: string; group: string }[] = [
      { name: "Client fees", group: "revenue" },
      { name: "Payment gateway fees", group: "direct_nonlabour" },
      { name: "Meta Ads", group: "opex" },
      { name: "Rent & tools", group: "opex" },
      { name: "Misc", group: "opex" },
      { name: "Coach salaries", group: "direct_labour" },
      { name: "Admin salaries", group: "mgmt_labour" },
      { name: "GST payment", group: "tax_gst" },
    ];
    const categoryId = new Map<string, string>();
    for (const c of categorySeed) {
      const res = await client.query(`insert into category (company_id, name, "group") values ($1,$2,$3) returning id`, [
        companyId,
        c.name,
        c.group,
      ]);
      categoryId.set(c.name, res.rows[0].id);
    }

    const month = new Date().toISOString().slice(0, 7);
    for (const [bucket, amount] of [
      ["direct", meeraFixture.labour.direct.priya],
      ["management", meeraFixture.labour.management.ritu],
    ] as const) {
      await client.query(`insert into labour_cost (company_id, month, bucket, amount, source) values ($1,$2,$3,$4,'manual')`, [
        companyId,
        month,
        bucket,
        amount,
      ]);
    }

    const today = daysAgo(0);
    const txns: { desc: string; amount: number; category: string; accountId: string }[] = [
      { desc: "Razorpay settlement - individual coaching", amount: meeraFixture.revenue.individualPrepaid, category: "Client fees", accountId: accounts.operating },
      { desc: "Razorpay gateway fees", amount: -meeraFixture.directNonLabour, category: "Payment gateway fees", accountId: accounts.operating },
      { desc: "Meta Ads - Facebook", amount: -meeraFixture.opex.metaAds, category: "Meta Ads", accountId: accounts.operating },
      { desc: "Rent and software tools", amount: -meeraFixture.opex.rentToolsSoftware, category: "Rent & tools", accountId: accounts.operating },
      { desc: "Misc expenses", amount: -meeraFixture.opex.misc, category: "Misc", accountId: accounts.operating },
      { desc: "Priya - coach salary", amount: -meeraFixture.labour.direct.priya, category: "Coach salaries", accountId: accounts.operating },
      { desc: "Ritu - admin salary", amount: -meeraFixture.labour.management.ritu, category: "Admin salaries", accountId: accounts.operating },
    ];
    for (const t of txns) {
      const hash = `seed-${companyId}-${t.desc}-${today}`;
      await client.query(
        `insert into transaction (company_id, bank_account_id, txn_date, description_raw, amount, category_id, source, dedupe_hash, confidence)
         values ($1,$2,$3,$4,$5,$6,'manual',$7,1.0)`,
        [companyId, t.accountId, today, t.desc, t.amount, categoryId.get(t.category), hash],
      );
    }

    const corporatePartyA = await client.query(
      `insert into party (company_id, name, kind, is_msme, payment_terms_days, tds_section, tds_rate_pct) values ($1,'Corporate client A','customer',false,45,$2,$3) returning id`,
      [companyId, meeraFixture.receivables.tdsSection, meeraFixture.receivables.tdsRatePct],
    );
    const corporatePartyB = await client.query(
      `insert into party (company_id, name, kind, is_msme, payment_terms_days, tds_section, tds_rate_pct) values ($1,'Corporate client B','customer',false,45,$2,$3) returning id`,
      [companyId, meeraFixture.receivables.tdsSection, meeraFixture.receivables.tdsRatePct],
    );

    for (const [party, ageing] of [
      [corporatePartyA.rows[0].id, meeraFixture.receivables.invoices[0].ageingDays],
      [corporatePartyB.rows[0].id, meeraFixture.receivables.invoices[1].ageingDays],
    ] as const) {
      const invoiceDate = daysAgo(ageing);
      const dueDate = daysAgo(Math.max(0, ageing - 30));
      const amount = meeraFixture.receivables.invoices[0].amount;
      const gst = Math.round(meeraFixture.receivables.gstUnpaidOnCorporateInvoices / 2);
      await client.query(
        `insert into invoice (company_id, party_id, invoice_no, invoice_date, delivery_date, due_date, taxable_amount, gst_amount, total_amount, tds_expected_amount, status, revenue_stream)
         values ($1,$2,$3,$4,$4,$5,$6,$7,$8,$9,'sent','Corporate (invoiced)')`,
        [companyId, party, `INV-${ageing}`, invoiceDate, dueDate, amount - gst, gst, amount, Math.round((amount * meeraFixture.receivables.tdsRatePct) / 100)],
      );
    }

    await client.query("commit");
    console.log(`Seeded "${meeraFixture.company.name}" — company_id=${companyId}, owner user_id=${userId}`);
    console.log(`Dev-session cookie value to use: ${userId}`);
  } catch (err) {
    await client.query("rollback");
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

main();
