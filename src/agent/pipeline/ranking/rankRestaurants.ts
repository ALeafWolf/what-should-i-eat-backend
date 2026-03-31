import type { NormalizedRestaurantQuery, RankedRestaurant, RestaurantCandidate, ReviewSnippet } from "../../../shared/types/index.js";
import { PRICE_LEVEL_MAP } from "../../../shared/constants/index.js";

/**
 * Ranks restaurant candidates by a deterministic rule-based score.
 * Phase 2: incorporate real review snippet data, rating weighting, budget filtering.
 *
 * Scoring factors:
 * - Google rating (0-5): weighted 40%
 * - User rating count (log-scaled): weighted 30%
 * - Budget fit (within range): weighted 20%
 * - Source diversity bonus: weighted 10%
 */
export function rankRestaurants(
  candidates: RestaurantCandidate[],
  query: NormalizedRestaurantQuery,
): RankedRestaurant[] {
  // TODO: implement full ranking logic in Phase 2 with real review data
  // - apply budget filter (exclude candidates clearly over budget)
  // - score by rating, review count, budget fit, source count
  // - sort descending by score
  // - assign confidence based on source count and review data quality

  return candidates.map((candidate, index) => {
    const ratingScore = (candidate.rating ?? 3) / 5;
    const countScore = Math.min(Math.log10((candidate.userRatingCount ?? 1) + 1) / 3, 1);
    const budgetFit =
      query.budget === undefined || candidate.priceLevel === undefined
        ? 0.5
        : candidate.priceLevel <= Math.ceil(query.budget / 100)
          ? 1
          : 0.2;

    const score = ratingScore * 0.4 + countScore * 0.3 + budgetFit * 0.2 + 0.1;

    const confidence: RankedRestaurant["confidence"] =
      (candidate.userRatingCount ?? 0) > 100 ? "high" : (candidate.userRatingCount ?? 0) > 20 ? "medium" : "low";

    const mockSnippets: ReviewSnippet[] = [];

    return {
      ...candidate,
      score,
      reviewSnippets: mockSnippets,
      reviewSummary: `Mock summary for ${candidate.name}. Real review summarization added in Phase 2.`,
      positives: ["Good food", "Nice atmosphere"],
      complaints: [],
      recommendedDishes: [],
      confidence,
      priceRange: PRICE_LEVEL_MAP[candidate.priceLevel ?? 2] ?? "$$",
    };
  }).sort((a, b) => b.score - a.score);
}
