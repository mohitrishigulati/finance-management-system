"use server";

import { redirect } from "next/navigation";
import { getAdminPool } from "@/lib/db";
import { getTemplate } from "@/lib/templates";
import { setCurrentUserId } from "@/lib/session";
import { colourBandsForMetric } from "@/lib/targetBands";

const RUPEE = 100;

function rupeesToPaise(value: FormDataEntryValue | null): number {
  const n = Number.parseFloat(String(value ?? "0").replace(/,/g, ""));
  return Math.round((Number.isFinite(n) ? n : 0) * RUPEE);
}

export async function createCompanyAction(formData: FormData) {
  const templateSlug = String(formData.get("industry_template"));
  const template = getTemplate(templateSlug);

  const ownerBucket = String(formData.get("owner_bucket") || template.owner_default_bucket) as "direct" | "sales" | "management";
  const ownerMarketSalary = rupeesToPaise(formData.get("owner_market_salary"));

  const pool = getAdminPool();
  const client = await pool.connect();
  try {
    await client.query("begin");

    const companyRes = await client.query(
      `insert into company (name, legal_name, gstin, pan, udyam_no, is_msme, industry_template, owner_market_salary_monthly, owner_bucket)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9) returning id`,
      [
        formData.get("company_name"),
        formData.get("legal_name") || formData.get("company_name"),
        formData.get("gstin") || null,
        formData.get("pan") || null,
        formData.get("udyam_no") || null,
        formData.get("udyam_no") ? true : false,
        templateSlug,
        ownerMarketSalary,
        ownerBucket,
      ],
    );
    const companyId: string = companyRes.rows[0].id;

    const userRes = await client.query(
      `insert into app_user (company_id, name, phone_whatsapp, roles) values ($1,$2,$3,$4) returning id`,
      [companyId, formData.get("owner_name"), formData.get("owner_whatsapp"), ["owner", "ops"]],
    );
    const userId: string = userRes.rows[0].id;

    const buckets: { key: string; balanceField: string }[] = [
      { key: "operating", balanceField: "operating_balance" },
      { key: "tax", balanceField: "tax_balance" },
      { key: "reserve", balanceField: "reserve_balance" },
    ];
    for (const b of buckets) {
      await client.query(
        `insert into bank_account (company_id, name, bucket, opening_balance) values ($1,$2,$3,$4)`,
        [companyId, `${b.key[0].toUpperCase()}${b.key.slice(1)}`, b.key, rupeesToPaise(formData.get(b.balanceField))],
      );
    }
    const creditCardDrawn = rupeesToPaise(formData.get("credit_card_drawn"));
    if (creditCardDrawn > 0) {
      await client.query(
        `insert into bank_account (company_id, name, bucket, opening_balance) values ($1,'Credit card','card',$2)`,
        [companyId, -creditCardDrawn],
      );
    }

    const categoryIdByName = new Map<string, string>();
    for (const cat of template.category_seed) {
      const res = await client.query(
        `insert into category (company_id, name, "group") values ($1,$2,$3) returning id`,
        [companyId, cat.name, cat.group],
      );
      categoryIdByName.set(cat.name, res.rows[0].id);
    }
    for (const rule of template.rule_seed) {
      const categoryId = categoryIdByName.get(rule.category);
      if (!categoryId) continue;
      await client.query(
        `insert into category_rule (company_id, match_type, pattern, category_id, created_by) values ($1,$2,$3,$4,$5)`,
        [companyId, rule.match_type, rule.pattern, categoryId, userId],
      );
    }

    const month = new Date().toISOString().slice(0, 7);
    const labourInputs: { bucket: "direct" | "sales" | "management"; field: string }[] = [
      { bucket: "direct", field: "labour_direct" },
      { bucket: "sales", field: "labour_sales" },
      { bucket: "management", field: "labour_management" },
    ];
    for (const l of labourInputs) {
      const amount = rupeesToPaise(formData.get(l.field));
      if (amount > 0) {
        await client.query(
          `insert into labour_cost (company_id, month, bucket, amount, source) values ($1,$2,$3,$4,'manual')`,
          [companyId, month, l.bucket, amount],
        );
      }
    }

    for (const [metric, value] of Object.entries(template.targets)) {
      const bands = colourBandsForMetric(metric, value);
      await client.query(
        `insert into target (company_id, metric, value, green_band, amber_band) values ($1,$2,$3,$4,$5)`,
        [companyId, metric, value, bands.green, bands.amber],
      );
    }

    await client.query("commit");
    await setCurrentUserId(userId);
  } catch (err) {
    await client.query("rollback");
    throw err;
  } finally {
    client.release();
  }

  redirect("/import");
}
