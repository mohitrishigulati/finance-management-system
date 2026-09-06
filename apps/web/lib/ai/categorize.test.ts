import { describe, expect, it } from "vitest";
import { applyCategorisationResults, type CategorizeTarget } from "./categorize";
import { categorisationResultSchema } from "./schemas";

const categories = [
  { id: "cat-ads", name: "Meta Ads" },
  { id: "cat-gst", name: "GST payment" },
];
const parties = [{ id: "party-1", name: "Acme Corp" }];
const batch = [
  { index: 10, descriptionRaw: "IMPS FACEBK ADS", amountPaise: -150000 },
  { index: 11, descriptionRaw: "GST NEFT", amountPaise: -270000 },
];

describe("categorisationResultSchema (T4 guardrail: validate or reject)", () => {
  it("accepts a well-formed model response", () => {
    const parsed = categorisationResultSchema.safeParse({
      results: [{ txn_index: 0, category_name: "Meta Ads", confidence: 0.95, reason: "Facebook ad spend" }],
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects a response with a confidence outside 0-1", () => {
    const parsed = categorisationResultSchema.safeParse({
      results: [{ txn_index: 0, category_name: "Meta Ads", confidence: 1.5, reason: "bad confidence" }],
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects a response missing a required field", () => {
    const parsed = categorisationResultSchema.safeParse({
      results: [{ txn_index: 0, category_name: "Meta Ads" }],
    });
    expect(parsed.success).toBe(false);
  });
});

describe("applyCategorisationResults (T4: never guesses)", () => {
  it("assigns category and party for a confident, valid result", () => {
    const results = new Map<number, CategorizeTarget>();
    applyCategorisationResults(
      { results: [{ txn_index: 0, category_name: "Meta Ads", party_name: null, confidence: 0.95, reason: "ad spend" }] },
      batch,
      categories,
      parties,
      results,
    );
    expect(results.get(10)).toEqual({ category_id: "cat-ads", party_id: null, confidence: 0.95, reason: "ad spend" });
  });

  it("drops a result below the confidence floor (queues to Inbox instead)", () => {
    const results = new Map<number, CategorizeTarget>();
    applyCategorisationResults(
      { results: [{ txn_index: 0, category_name: "Meta Ads", confidence: 0.5, reason: "not sure" }] },
      batch,
      categories,
      parties,
      results,
    );
    expect(results.has(10)).toBe(false);
  });

  it("rejects a category name the model invented that isn't in the company's category list", () => {
    const results = new Map<number, CategorizeTarget>();
    applyCategorisationResults(
      { results: [{ txn_index: 0, category_name: "Made Up Category", confidence: 0.99, reason: "guessing" }] },
      batch,
      categories,
      parties,
      results,
    );
    expect(results.size).toBe(0);
  });

  it("treats a null parsed_output (schema validation failed) as leaving the whole batch uncategorised", () => {
    const results = new Map<number, CategorizeTarget>();
    applyCategorisationResults(null, batch, categories, parties, results);
    expect(results.size).toBe(0);
  });

  it("resolves a party_name to the matching party id", () => {
    const results = new Map<number, CategorizeTarget>();
    applyCategorisationResults(
      { results: [{ txn_index: 1, category_name: "GST payment", party_name: "Acme Corp", confidence: 0.9, reason: "gst" }] },
      batch,
      categories,
      parties,
      results,
    );
    expect(results.get(11)?.party_id).toBe("party-1");
  });
});
