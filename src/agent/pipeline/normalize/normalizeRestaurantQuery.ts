import type { RestaurantSearchRequest, NormalizedRestaurantQuery } from "../../../shared/types/index.js";

export function normalizeRestaurantQuery(raw: RestaurantSearchRequest): NormalizedRestaurantQuery {
  return {
    area: raw.area.trim().toLowerCase(),
    cuisine: raw.cuisine.trim().toLowerCase(),
    budget: raw.budget,
    preferences: (raw.preferences ?? []).map((p) => p.trim().toLowerCase()).filter(Boolean),
    sessionId: raw.sessionId,
  };
}
