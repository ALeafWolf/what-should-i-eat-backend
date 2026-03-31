import type { RestaurantSearchRequest, NormalizedRestaurantQuery } from "../../../shared/types/index.js";

/**
 * Normalizes a raw restaurant search request into a consistent internal shape.
 * Phase 2: trim whitespace, lowercase cuisine/area, apply budget defaults,
 * canonicalize preference tags.
 */
export function normalizeRestaurantQuery(raw: RestaurantSearchRequest): NormalizedRestaurantQuery {
  // TODO: implement full normalization in Phase 2
  // - trim and lowercase area and cuisine
  // - map cuisine aliases (e.g. "cantonese" -> "Cantonese Chinese")
  // - convert budget units if needed
  // - canonicalize preference tags
  return {
    area: raw.area.trim(),
    cuisine: raw.cuisine.trim(),
    budget: raw.budget,
    preferences: raw.preferences ?? [],
    sessionId: raw.sessionId,
  };
}
