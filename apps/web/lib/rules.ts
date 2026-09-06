export interface CategoryRule {
  id: string;
  match_type: "party" | "contains" | "regex";
  pattern: string;
  category_id: string;
  party_id: string | null;
}

export interface RuleMatch {
  category_id: string;
  party_id: string | null;
  rule_id: string;
}

/**
 * Rule-first categorisation (BLUEPRINT.md §3 step 2, Slice 1 scope — no AI
 * yet). Rules are checked in order; the first match wins. AI categorisation
 * (Slice 2) only runs on what rules leave unmatched.
 */
export function matchRule(descriptionRaw: string, partyId: string | null, rules: CategoryRule[]): RuleMatch | null {
  const description = descriptionRaw.toUpperCase();
  for (const rule of rules) {
    if (rule.match_type === "party" && rule.party_id && rule.party_id === partyId) {
      return { category_id: rule.category_id, party_id: rule.party_id, rule_id: rule.id };
    }
    if (rule.match_type === "contains" && description.includes(rule.pattern.toUpperCase())) {
      return { category_id: rule.category_id, party_id: rule.party_id, rule_id: rule.id };
    }
    if (rule.match_type === "regex") {
      try {
        const re = new RegExp(rule.pattern, "i");
        if (re.test(descriptionRaw)) {
          return { category_id: rule.category_id, party_id: rule.party_id, rule_id: rule.id };
        }
      } catch {
        // an invalid regex saved by a user shouldn't crash import; skip it
      }
    }
  }
  return null;
}
