import { z } from "zod";

export const ConfidenceSchema = z.enum(["high", "medium", "low"]);

export const RestaurantResultSchema = z.object({
  id: z.string(),
  name: z.string(),
  area: z.string(),
  cuisine: z.string(),
  priceRange: z.string(),
  reviewSummary: z.string(),
  positives: z.array(z.string()),
  complaints: z.array(z.string()),
  recommendedDishes: z.array(z.string()),
  sourceCount: z.number().int().nonnegative(),
  confidence: ConfidenceSchema,
});

export const RestaurantResponseSchema = z.object({
  restaurants: z.array(RestaurantResultSchema),
  finalRecommendation: z.string(),
});

export const DifficultySchema = z.enum(["easy", "medium", "hard"]);

export const RecipeResultSchema = z.object({
  name: z.string(),
  matchedIngredients: z.array(z.string()),
  missingIngredients: z.array(z.string()),
  estimatedTime: z.string(),
  difficulty: DifficultySchema,
  source: z.string(),
  steps: z.array(z.string()),
  fitReason: z.string(),
});

export const RecipeResponseSchema = z.object({
  recipes: z.array(RecipeResultSchema),
  finalRecommendation: z.string(),
});

export const ChatResponseSchema = z.object({
  message: z.string(),
  sessionId: z.string().optional(),
});
