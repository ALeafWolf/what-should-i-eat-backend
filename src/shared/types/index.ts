import type { z } from "zod";
import type {
  RestaurantSearchRequestSchema,
  RecipeSearchRequestSchema,
  ChatRequestSchema,
} from "../../agent/schemas/request.schemas.js";
import type {
  RestaurantResultSchema,
  RestaurantResponseSchema,
  RestaurantSourceSchema,
  RecipeResultSchema,
  RecipeResponseSchema,
  ChatResponseSchema,
  ConfidenceSchema,
  DifficultySchema,
} from "../../agent/schemas/response.schemas.js";
import type {
  RestaurantCandidateSchema,
  RestaurantSearchToolInputSchema,
  RestaurantSearchToolOutputSchema,
  RestaurantReviewsToolInputSchema,
  RestaurantReviewsToolOutputSchema,
  ReviewSnippetSchema,
  RecipeCandidateSchema,
  RecipeSearchToolInputSchema,
  RecipeSearchToolOutputSchema,
  WebPageExtractToolInputSchema,
  WebPageExtractToolOutputSchema,
} from "../../agent/schemas/tool-io.schemas.js";
export type {
  SessionData,
  ConversationTurn,
  RestaurantResultSummary,
  SessionRestaurantQuery,
} from "../../agent/schemas/session.schemas.js";

// --- Request types ---
export type RestaurantSearchRequest = z.infer<typeof RestaurantSearchRequestSchema>;
export type RecipeSearchRequest = z.infer<typeof RecipeSearchRequestSchema>;
export type ChatRequest = z.infer<typeof ChatRequestSchema>;

// --- Response types ---
export type Confidence = z.infer<typeof ConfidenceSchema>;
export type Difficulty = z.infer<typeof DifficultySchema>;
export type RestaurantSource = z.infer<typeof RestaurantSourceSchema>;
export type RestaurantResult = z.infer<typeof RestaurantResultSchema>;
export type RestaurantResponse = z.infer<typeof RestaurantResponseSchema>;
export type RecipeResult = z.infer<typeof RecipeResultSchema>;
export type RecipeResponse = z.infer<typeof RecipeResponseSchema>;
export type ChatResponse = z.infer<typeof ChatResponseSchema>;

// --- Tool I/O types ---
export type RestaurantCandidate = z.infer<typeof RestaurantCandidateSchema>;
export type RestaurantSearchToolInput = z.infer<typeof RestaurantSearchToolInputSchema>;
export type RestaurantSearchToolOutput = z.infer<typeof RestaurantSearchToolOutputSchema>;
export type RestaurantReviewsToolInput = z.infer<typeof RestaurantReviewsToolInputSchema>;
export type RestaurantReviewsToolOutput = z.infer<typeof RestaurantReviewsToolOutputSchema>;
export type ReviewSnippet = z.infer<typeof ReviewSnippetSchema>;
export type RecipeCandidate = z.infer<typeof RecipeCandidateSchema>;
export type RecipeSearchToolInput = z.infer<typeof RecipeSearchToolInputSchema>;
export type RecipeSearchToolOutput = z.infer<typeof RecipeSearchToolOutputSchema>;
export type WebPageExtractToolInput = z.infer<typeof WebPageExtractToolInputSchema>;
export type WebPageExtractToolOutput = z.infer<typeof WebPageExtractToolOutputSchema>;

// --- Workflow emitter ---
import type { SseEvent } from "../../agent/schemas/sse.schemas.js";
export type { SseEvent };
export type WorkflowEmitter = (event: SseEvent) => void;

// --- Intermediate pipeline types ---

export interface NormalizedRestaurantQuery {
  area: string;
  cuisine: string;
  budget: number | undefined;
  preferences: string[];
  sessionId: string | undefined;
  language: string | undefined;
  currency: string | undefined;
}

export interface NormalizedRecipeQuery {
  ingredients: string[];
  exclusions: string[];
  cookingTime: number | undefined;
  difficulty: Difficulty | undefined;
  servings: number | undefined;
  sessionId: string | undefined;
}

export interface ReviewSummary {
  reviewSummary: string;
  positives: string[];
  complaints: string[];
  recommendedDishes: string[];
}

export interface RankedRestaurant extends RestaurantCandidate {
  score: number;
  priceRange: string;
  reviewSnippets: ReviewSnippet[];
  reviewSummary: string;
  positives: string[];
  complaints: string[];
  recommendedDishes: string[];
  confidence: Confidence;
}

export interface RankedRecipe extends RecipeCandidate {
  score: number;
  matchedIngredients: string[];
  missingIngredients: string[];
  steps: string[];
  fitReason: string;
}
