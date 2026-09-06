import Anthropic from "@anthropic-ai/sdk";

/**
 * Lazy Anthropic client. Per BLUEPRINT.md §12, the two AI jobs Slice 2 needs
 * use different tiers: haiku-4-5 for bulk categorisation (cheap, high volume),
 * sonnet-5 for PDF extraction (needs more judgment reading a scanned table).
 * If ANTHROPIC_API_KEY is unset, callers fall back to leaving transactions
 * uncategorised (queued to Inbox) rather than guessing — per CLAUDE.md, every
 * live call is gated so `pnpm dev` works with zero external accounts.
 */
export const CATEGORISE_MODEL = "claude-haiku-4-5";
export const PDF_PARSE_MODEL = "claude-sonnet-5";

let client: Anthropic | null | undefined;

export function hasAI(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export function getAnthropicClient(): Anthropic {
  if (!hasAI()) {
    throw new Error("ANTHROPIC_API_KEY is not set — check hasAI() before calling getAnthropicClient().");
  }
  if (!client) {
    client = new Anthropic();
  }
  return client;
}
