import type { RankedRecipe, RecipeResponse, RecipeResult } from "../../../shared/types/index.js";

/**
 * Converts ranked recipe data into the final API response shape.
 * Phase 6: generate real finalRecommendation from LLM synthesis.
 */
export function buildRecipeResponse(ranked: RankedRecipe[]): RecipeResponse {
  // TODO: Phase 6 - generate finalRecommendation via LLM synthesis
  const recipes: RecipeResult[] = ranked.map((r) => ({
    name: r.name,
    matchedIngredients: r.matchedIngredients,
    missingIngredients: r.missingIngredients,
    estimatedTime: r.estimatedTime ?? "Unknown",
    difficulty: r.difficulty ?? "medium",
    source: r.source,
    steps: r.steps,
    fitReason: r.fitReason,
  }));

  const topName = recipes[0]?.name ?? "a recipe";
  const finalRecommendation =
    recipes.length > 0
      ? `Based on your ingredients, ${topName} is the best match. Detailed LLM synthesis available in Phase 6.`
      : "No recipes found matching your ingredients.";

  return { recipes, finalRecommendation };
}
