import type { RecipeCandidate } from "../../../shared/types/index.js";

/**
 * Removes duplicate recipe candidates from merged search results.
 * Phase 2: dedup by normalized name + source domain, prefer higher-quality sources.
 */
export function dedupRecipes(candidates: RecipeCandidate[]): RecipeCandidate[] {
  // TODO: implement full dedup in Phase 2
  // - normalize recipe name (lowercase, strip punctuation) as dedup key
  // - also deduplicate by source URL domain + name combo
  // - retain the record with the richer snippet/metadata
  const seen = new Map<string, RecipeCandidate>();

  for (const candidate of candidates) {
    const key = candidate.name.toLowerCase().trim();
    if (!seen.has(key)) {
      seen.set(key, candidate);
    }
  }

  return Array.from(seen.values());
}
