import { z } from "zod";

export const RestaurantSearchRequestSchema = z.object({
  area: z.string().min(1, "area is required"),
  cuisine: z.string().min(1, "cuisine is required"),
  budget: z.number().positive().optional(),
  preferences: z.array(z.string()).optional(),
  sessionId: z.string().optional(),
  language: z.string().optional(),
  currency: z.string().optional(),
});

export const RecipeSearchRequestSchema = z.object({
  ingredients: z.array(z.string().min(1)).min(1, "at least one ingredient is required"),
  exclusions: z.array(z.string()).optional(),
  cookingTime: z.number().positive().optional(),
  difficulty: z.enum(["easy", "medium", "hard"]).optional(),
  servings: z.number().positive().int().optional(),
  sessionId: z.string().optional(),
});

export const ChatRequestSchema = z.object({
  message: z.string().min(1, "message is required"),
  sessionId: z.string().optional(),
});
