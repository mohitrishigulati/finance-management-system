import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

// config/templates/ lives at the repo root (BLUEPRINT.md §13), shared across
// apps — not copied into apps/web, so a new template file needs no rebuild.
const TEMPLATES_DIR = path.join(process.cwd(), "..", "..", "config", "templates");

export interface IndustryTemplate {
  slug: string;
  label: string;
  has_inventory: boolean;
  revenue_streams: { name: string; expected_payment_days: number }[];
  owner_default_bucket: "direct" | "sales" | "management";
  gross_margin_pct_typical: number;
  targets: Record<string, number>;
  category_seed: { name: string; group: string }[];
  rule_seed: { match_type: string; pattern: string; category: string }[];
  reminder_register: string;
}

export function listTemplates(): IndustryTemplate[] {
  return readdirSync(TEMPLATES_DIR)
    .filter((f) => f.endsWith(".json"))
    .map((f) => JSON.parse(readFileSync(path.join(TEMPLATES_DIR, f), "utf8")));
}

export function getTemplate(slug: string): IndustryTemplate {
  const found = listTemplates().find((t) => t.slug === slug);
  if (!found) throw new Error(`Unknown industry template: ${slug}`);
  return found;
}
