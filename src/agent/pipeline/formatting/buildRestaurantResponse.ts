import type { RankedRestaurant, RestaurantResponse, RestaurantResult } from "../../../shared/types/index.js";

function buildFinalRecommendation(top: RankedRestaurant[]): string {
  if (top.length === 0) return "No restaurants found matching your criteria.";

  if (top.length === 1) {
    const r = top[0]!;
    const highlights =
      r.positives.length > 0 ? ` Highlights: ${r.positives.slice(0, 2).join(", ")}.` : "";
    return `${r.name} is the top recommendation in ${r.area} for ${r.cuisine} cuisine (${r.priceRange}, confidence: ${r.confidence}).${highlights}`;
  }

  const picks = top
    .slice(0, 3)
    .map((r) => `${r.name} (${r.priceRange})`)
    .join(", ");
  const best = top[0]!;
  const dishes =
    best.recommendedDishes.length > 0
      ? ` Try ${best.recommendedDishes.slice(0, 2).join(" or ")} at ${best.name}.`
      : "";
  return `Top picks for ${best.cuisine} cuisine in ${best.area}: ${picks}. ${best.name} leads with the highest score.${dishes}`;
}

export function buildRestaurantResponse(ranked: RankedRestaurant[]): RestaurantResponse {
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

  const finalRecommendation = buildFinalRecommendation(ranked.slice(0, 3));

  return { restaurants, finalRecommendation };
}
