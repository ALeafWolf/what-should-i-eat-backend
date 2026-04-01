import { z } from "zod";

// --- Restaurant Search Tool ---

export const RestaurantSearchToolInputSchema = z.object({
  area: z.string(),
  cuisine: z.string(),
  budget: z.number().positive().optional(),
  preferences: z.array(z.string()).optional(),
  language: z.string().optional(),
});

export const RestaurantCandidateSchema = z.object({
  id: z.string(),
  name: z.string(),
  area: z.string(),
  cuisine: z.string(),
  displayPriceRange: z.string().optional(),
  priceLevel: z.number().int().min(1).max(4).optional(),
  rating: z.number().min(0).max(5).optional(),
  userRatingCount: z.number().int().nonnegative().optional(),
  address: z.string().optional(),
  sourceUrl: z.string().url().optional(),
  googleMapsUrl: z.string().url().optional(),
  websiteUrl: z.string().url().optional(),
  source: z.enum(["google_places", "web_search"]),
});

export const RestaurantSearchToolOutputSchema = z.object({
  candidates: z.array(RestaurantCandidateSchema),
  totalFound: z.number().int().nonnegative(),
});

// --- Restaurant Reviews Tool ---

export const RestaurantReviewsToolInputSchema = z.object({
  restaurantId: z.string(),
  restaurantName: z.string(),
  maxSnippets: z.number().int().positive().default(10),
});

export const ReviewSnippetSchema = z.object({
  text: z.string(),
  rating: z.number().min(0).max(5).optional(),
  source: z.string(),
  author: z.string().optional(),
  date: z.string().optional(),
});

export const RestaurantReviewsToolOutputSchema = z.object({
  restaurantId: z.string(),
  snippets: z.array(ReviewSnippetSchema),
});

// --- Recipe Search Tool ---

export const RecipeSearchToolInputSchema = z.object({
  ingredients: z.array(z.string()).min(1),
  exclusions: z.array(z.string()).optional(),
  cookingTime: z.number().positive().optional(),
  difficulty: z.enum(["easy", "medium", "hard"]).optional(),
  servings: z.number().positive().int().optional(),
  maxResults: z.number().int().positive().default(10),
});

export const RecipeCandidateSchema = z.object({
  name: z.string(),
  sourceUrl: z.string().url(),
  source: z.string(),
  snippet: z.string().optional(),
  estimatedTime: z.string().optional(),
  difficulty: z.enum(["easy", "medium", "hard"]).optional(),
});

export const RecipeSearchToolOutputSchema = z.object({
  candidates: z.array(RecipeCandidateSchema),
  totalFound: z.number().int().nonnegative(),
});

// --- Web Page Extract Tool ---

export const WebPageExtractToolInputSchema = z.object({
  url: z.string().url(),
  targetFields: z.array(z.string()).describe("Field names to extract from the page"),
  maxContentLength: z.number().int().positive().default(8000),
});

export const WebPageExtractToolOutputSchema = z.object({
  url: z.string().url(),
  extractedData: z.record(z.unknown()),
  confidence: z.enum(["high", "medium", "low"]),
  truncated: z.boolean(),
});
