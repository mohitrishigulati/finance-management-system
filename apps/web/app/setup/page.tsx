import { listTemplates } from "@/lib/templates";
import { createCompanyAction } from "./actions";

export default function SetupPage() {
  const templates = listTemplates();

  return (
    <main className="p-4">
      <p className="text-xs uppercase tracking-[0.22em] text-slate-500 mb-1">Setup · once, then quarterly</p>
      <h1 className="text-lg font-bold mb-4">Set up your company</h1>

      <form action={createCompanyAction} className="flex flex-col gap-6">
        <Section title="Company">
          <Field label="Company name" name="company_name" required />
          <Field label="Legal name" name="legal_name" />
          <div className="flex gap-3">
            <Field label="GSTIN" name="gstin" />
            <Field label="PAN" name="pan" />
          </div>
          <Field label="Udyam number (MSME)" name="udyam_no" hint="Leave blank if not MSME-registered" />
        </Section>

        <Section title="Industry template">
          <label className="text-sm text-slate-600 mb-1 block" htmlFor="industry_template">
            Template
          </label>
          <select
            id="industry_template"
            name="industry_template"
            required
            className="w-full border border-slate-200 rounded px-3 py-2 text-base"
          >
            {templates.map((t) => (
              <option key={t.slug} value={t.slug}>
                {t.label}
              </option>
            ))}
          </select>
        </Section>

        <Section title="Owner">
          <Field label="Owner name" name="owner_name" required />
          <Field label="WhatsApp number" name="owner_whatsapp" required hint="+91XXXXXXXXXX" />
          <Field label="Owner market salary (₹/month)" name="owner_market_salary" required hint="What you'd pay a stranger to do your job" />
          <label className="text-sm text-slate-600 mb-1 block" htmlFor="owner_bucket">
            Owner's role bucket
          </label>
          <select id="owner_bucket" name="owner_bucket" className="w-full border border-slate-200 rounded px-3 py-2 text-base">
            <option value="direct">Direct (delivers the work)</option>
            <option value="management">Management</option>
          </select>
        </Section>

        <Section title="Bank accounts — opening balances (₹)">
          <Field label="Operating" name="operating_balance" required />
          <Field label="Tax" name="tax_balance" />
          <Field label="Reserve" name="reserve_balance" />
          <Field label="Credit card / OD drawn" name="credit_card_drawn" hint="Enter as a positive amount owed" />
        </Section>

        <Section title="Labour costs this month (₹) — excluding your own salary above">
          <Field label="Direct labour (e.g. other coaches, technicians)" name="labour_direct" />
          <Field label="Sales labour" name="labour_sales" />
          <Field label="Management labour (e.g. admin/ops help)" name="labour_management" />
        </Section>

        <button type="submit" className="bg-primary text-white rounded py-3 text-base font-medium">
          Create company
        </button>
      </form>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="border border-slate-200 rounded p-4">
      <legend className="text-sm font-bold px-1">{title}</legend>
      <div className="flex flex-col gap-3 mt-2">{children}</div>
    </fieldset>
  );
}

function Field({
  label,
  name,
  required,
  hint,
}: {
  label: string;
  name: string;
  required?: boolean;
  hint?: string;
}) {
  return (
    <div className="flex-1">
      <label className="text-sm text-slate-600 mb-1 block" htmlFor={name}>
        {label}
      </label>
      <input
        id={name}
        name={name}
        required={required}
        className="w-full border border-slate-200 rounded px-3 py-2 text-base tabular-nums"
      />
      {hint && <p className="text-xs text-slate-500 mt-1">{hint}</p>}
    </div>
  );
}
