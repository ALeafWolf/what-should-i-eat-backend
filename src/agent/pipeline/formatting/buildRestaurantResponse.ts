import type { RankedRestaurant, RestaurantResponse, RestaurantResult } from "../../../shared/types/index.js";

/**
 * Converts ranked restaurant data into the final API response shape.
 * Phase 2: generate real finalRecommendation from LLM synthesis.
 */
export function buildRestaurantResponse(ranked: RankedRestaurant[]): RestaurantResponse {
  // TODO: Phase 2 - generate finalRecommendation via LLM synthesis
  const restaurants: RestaurantResult[] = ranked.map((r) => ({
    id: r.id,
    name: r.name,
    area: r.area,
    cuisine: r.cuisine,
    priceRange: r.priceRange ?? "$$",
    reviewSummary: r.reviewSummary,
    positives: r.positives,
    complaints: r.complaints,
    recommendedDishes: r.recommendedDishes,
    sourceCount: r.reviewSnippets.length,
    confidence: r.confidence,
  }));

  const topName = restaurants[0]?.name ?? "a restaurant";
  const finalRecommendation =
    restaurants.length > 0
      ? `Based on available data, ${topName} is the top recommendation. Detailed LLM synthesis available in Phase 2.`
      : "No restaurants found matching your criteria.";

  return { restaurants, finalRecommendation };
}
