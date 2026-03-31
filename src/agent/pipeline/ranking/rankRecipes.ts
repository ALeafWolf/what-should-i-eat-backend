import type { NormalizedRecipeQuery, RankedRecipe, RecipeCandidate } from "../../../shared/types/index.js";

/**
 * Ranks recipe candidates by a deterministic rule-based score.
 * Phase 6: incorporate real extracted ingredient match data.
 *
 * Scoring factors:
 * - Ingredient match ratio: weighted 50%
 * - Missing ingredient count penalty: weighted 30%
 * - Time/difficulty fit: weighted 20%
 */
export function rankRecipes(
  candidates: RecipeCandidate[],
  query: NormalizedRecipeQuery,
): RankedRecipe[] {
  // TODO: implement full ranking logic in Phase 6 with real extracted recipe data
  // - compute ingredient match ratio against query.ingredients
  // - penalize recipes with many missing ingredients
  // - apply difficulty and cooking time filters
  // - sort descending by score

  return candidates.map((candidate) => {
    const score = 0.5;

    return {
      ...candidate,
      score,
      matchedIngredients: query.ingredients.slice(0, 2),
      missingIngredients: [],
      steps: ["Step extraction available after Phase 6 web_page_extract_tool implementation."],
      fitReason: `Mock fit reason for ${candidate.name}. Real scoring added in Phase 6.`,
      difficulty: candidate.difficulty ?? query.difficulty ?? "medium",
      estimatedTime: candidate.estimatedTime ?? "30 minutes",
    };
  }).sort((a, b) => b.score - a.score);
}
