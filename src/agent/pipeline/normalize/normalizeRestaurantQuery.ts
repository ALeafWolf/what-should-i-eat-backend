import type { RestaurantSearchRequest, NormalizedRestaurantQuery } from "../../../shared/types/index.js";

export function normalizeRestaurantQuery(raw: RestaurantSearchRequest): NormalizedRestaurantQuery {
  return {
    area: raw.area.trim().toLowerCase(),
    areaEn: raw.areaEn?.trim() || undefined,
    cuisine: raw.cuisine.trim().toLowerCase(),
    cuisineEn: raw.cuisineEn?.trim() || undefined,
    budget: raw.budget,
    preferences: (raw.preferences ?? []).map((p) => p.trim().toLowerCase()).filter(Boolean),
    sessionId: raw.sessionId,
    language: raw.language,
    currency: raw.currency?.toUpperCase(),
  };
}
