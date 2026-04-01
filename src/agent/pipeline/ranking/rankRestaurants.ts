import type {
  NormalizedRestaurantQuery,
  RankedRestaurant,
  RestaurantCandidate,
  ReviewSnippet,
  ReviewSummary,
} from "../../../shared/types/index.js";
import { PRICE_LEVEL_MAP, CURRENCY_PRICE_LEVEL_DIVISORS } from "../../../shared/constants/index.js";

export interface RestaurantReviewData {
  snippets: ReviewSnippet[];
  summary: ReviewSummary;
}

/**
 * Ranks restaurant candidates by a deterministic rule-based score.
 *
 * Scoring:
 * - Rating (0-5 normalized):  40%
 * - Review count (log-scaled): 30%
 * - Budget fit:                20%
 * - Source diversity bonus:    10%
 */
export function rankRestaurants(
  candidates: RestaurantCandidate[],
  query: NormalizedRestaurantQuery,
  reviewData: Map<string, RestaurantReviewData> = new Map(),
): RankedRestaurant[] {
  const currency = query.currency ?? "JPY";
  const divisor = CURRENCY_PRICE_LEVEL_DIVISORS[currency] ?? CURRENCY_PRICE_LEVEL_DIVISORS["JPY"]!;
  const budgetPriceLevel =
    query.budget !== undefined ? Math.ceil(query.budget / divisor) : undefined;

  const filtered =
    budgetPriceLevel !== undefined
      ? candidates.filter(
          (c) => c.priceLevel === undefined || c.priceLevel <= budgetPriceLevel + 1,
        )
      : candidates;

  return filtered
    .map((candidate) => {
      const ratingScore = (candidate.rating ?? 3) / 5;
      const countScore = Math.min(
        Math.log10((candidate.userRatingCount ?? 1) + 1) / 3,
        1,
      );
      const budgetFit =
        budgetPriceLevel === undefined || candidate.priceLevel === undefined
          ? 0.5
          : candidate.priceLevel <= budgetPriceLevel
            ? 1
            : 0.2;
      const sourceDiversity = candidate.source === "google_places" ? 0.1 : 0.05;

      const score = ratingScore * 0.4 + countScore * 0.3 + budgetFit * 0.2 + sourceDiversity;

      const review = reviewData.get(candidate.id);
      const snippets = review?.snippets ?? [];
      const summary = review?.summary;

      const confidence: RankedRestaurant["confidence"] =
        (candidate.userRatingCount ?? 0) > 100 && snippets.length > 0
          ? "high"
          : (candidate.userRatingCount ?? 0) > 20 || snippets.length > 0
            ? "medium"
            : "low";

      return {
        ...candidate,
        score,
        reviewSnippets: snippets,
        reviewSummary: summary?.reviewSummary ?? `No review summary available for ${candidate.name}.`,
        positives: summary?.positives ?? [],
        complaints: summary?.complaints ?? [],
        recommendedDishes: summary?.recommendedDishes ?? [],
        confidence,
        priceRange: PRICE_LEVEL_MAP[candidate.priceLevel ?? 2] ?? "$$",
      };
    })
    .sort((a, b) => b.score - a.score);
}
