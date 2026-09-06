import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { getAnthropicClient, hasAI, CATEGORISE_MODEL } from "./client";
import { categorisationResultSchema, type CategorisationResult } from "./schemas";

export interface CategorizeCandidate {
  index: number;
  descriptionRaw: string;
  amountPaise: number;
}

export interface CategorizeTarget {
  category_id: string;
  party_id: string | null;
  confidence: number;
  reason: string;
}

const BATCH_SIZE = 50;
const CONFIDENCE_FLOOR = 0.8;

/**
 * Merges one batch's validated model output into the results map. Pure and
 * synchronous — no network — so the "reject what doesn't validate or isn't
 * confident" guardrail (BLUEPRINT.md §12) is unit-testable without a live
 * API key. `parsed` is null when the model's response failed schema
 * validation entirely (client.messages.parse sets parsed_output to null).
 */
export function applyCategorisationResults(
  parsed: CategorisationResult | null,
  batch: CategorizeCandidate[],
  categories: { id: string; name: string }[],
  parties: { id: string; name: string }[],
  results: Map<number, CategorizeTarget>,
): void {
  if (!parsed) return; // failed to validate — leave this whole batch uncategorised
  const categoryByName = new Map(categories.map((c) => [c.name, c]));
  const partyByName = new Map(parties.map((p) => [p.name, p]));

  for (const r of parsed.results) {
    if (r.confidence < CONFIDENCE_FLOOR) continue;
    const category = categoryByName.get(r.category_name);
    if (!category) continue; // model named a category that doesn't exist — reject, don't guess
    const candidate = batch[r.txn_index];
    if (!candidate) continue;
    const party = r.party_name ? partyByName.get(r.party_name) : undefined;
    results.set(candidate.index, {
      category_id: category.id,
      party_id: party?.id ?? null,
      confidence: r.confidence,
      reason: r.reason,
    });
  }
}

/**
 * BLUEPRINT.md §12 — Categorise job. Rules run first (lib/rules.ts); this
 * only sees what rules left unmatched. Returns a map keyed by candidate
 * index; a candidate absent from the map (validation failed, low confidence,
 * or ANTHROPIC_API_KEY unset) stays uncategorised and queues to the Inbox —
 * the AI never invents a category it isn't confident about.
 */
export async function categorizeTransactions(
  candidates: CategorizeCandidate[],
  categories: { id: string; name: string; group: string }[],
  parties: { id: string; name: string }[],
): Promise<Map<number, CategorizeTarget>> {
  const results = new Map<number, CategorizeTarget>();
  if (!hasAI() || candidates.length === 0) return results;

  const client = getAnthropicClient();

  for (let i = 0; i < candidates.length; i += BATCH_SIZE) {
    const batch = candidates.slice(i, i + BATCH_SIZE);
    const prompt = [
      "Categorise these bank transactions for a small Indian business.",
      "Categories available (use category_name exactly as given):",
      categories.map((c) => `- ${c.name} (${c.group})`).join("\n"),
      parties.length > 0 ? `\nKnown parties: ${parties.map((p) => p.name).join(", ")}` : "",
      "\nTransactions (txn_index is the array index below, amount is signed paise: credit +, debit -):",
      batch
        .map((c, localIdx) => `${localIdx}. amount=${c.amountPaise} description="${c.descriptionRaw}"`)
        .join("\n"),
      "\nFor each transaction, pick the single best category_name, an optional party_name if the description clearly names a known party, a confidence 0-1, and a one-sentence reason.",
    ].join("\n");

    const response = await client.messages.parse({
      model: CATEGORISE_MODEL,
      max_tokens: 4096,
      messages: [{ role: "user", content: prompt }],
      output_config: { format: zodOutputFormat(categorisationResultSchema) },
    });

    applyCategorisationResults(response.parsed_output, batch, categories, parties, results);
  }

  return results;
}
