import type { Request, Response, NextFunction } from "express";
import type { RecipeSearchRequest } from "../../shared/types/index.js";
import { normalizeIngredients } from "../../agent/pipeline/normalize/normalizeIngredients.js";
import { dedupRecipes } from "../../agent/pipeline/dedup/dedupRecipes.js";
import { rankRecipes } from "../../agent/pipeline/ranking/rankRecipes.js";
import { buildRecipeResponse } from "../../agent/pipeline/formatting/buildRecipeResponse.js";
import { searchRecipesViaWeb } from "../../services/clients/webSearch.js";

export async function searchRecipes(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const body = req.body as RecipeSearchRequest;

    // Phase 1: pipeline wired with mock client data
    // Phase 6: replace with real recipe workflow orchestrator
    const normalizedIngredients = normalizeIngredients(body.ingredients);
    const normalizedExclusions = normalizeIngredients(body.exclusions ?? []);

    const normalizedQuery = {
      ingredients: normalizedIngredients,
      exclusions: normalizedExclusions,
      cookingTime: body.cookingTime,
      difficulty: body.difficulty,
      servings: body.servings,
      sessionId: body.sessionId,
    };

    const searchResult = await searchRecipesViaWeb({
      ingredients: normalizedIngredients,
      exclusions: normalizedExclusions,
      cookingTime: body.cookingTime,
      difficulty: body.difficulty,
      servings: body.servings,
      maxResults: 10,
    });

    const deduped = dedupRecipes(searchResult.candidates);
    const ranked = rankRecipes(deduped, normalizedQuery);
    const response = buildRecipeResponse(ranked);

    res.json(response);
  } catch (err) {
    next(err);
  }
}
