import type { RestaurantCandidate } from "../../../shared/types/index.js";

/**
 * Removes duplicate restaurant candidates from merged source results.
 * Phase 2: merge by normalized name + area, prefer Google Places record,
 * carry over source metadata from duplicates.
 */
export function dedupRestaurants(candidates: RestaurantCandidate[]): RestaurantCandidate[] {
  // TODO: implement full dedup in Phase 2
  // - normalize name (lowercase, strip punctuation) + area as dedup key
  // - merge duplicate records (prefer google_places source data)
  // - carry over sourceUrl from all matched records
  const seen = new Map<string, RestaurantCandidate>();

  for (const candidate of candidates) {
    const key = `${candidate.name.toLowerCase().trim()}:${candidate.area.toLowerCase().trim()}`;
    if (!seen.has(key)) {
      seen.set(key, candidate);
    }
  }

  return Array.from(seen.values());
}
