/** Shared between the app's billing page and the landing pricing section
 *  — both group plans into the same two tabs, so the categorization logic
 *  needs to live in exactly one place. */

export type PlanCategory = "personal" | "business";

/** Personal-only entity cap (exactly 1, always) vs. anything that adds
 *  business entities (a fixed extra allowance, or unlimited) — derived
 *  from max_entities rather than a hardcoded plan-code list, so a future
 *  plan slots into the right tab automatically. */
export function categoryOf(plan: { max_entities: number | null }): PlanCategory {
  return plan.max_entities === 1 ? "personal" : "business";
}
