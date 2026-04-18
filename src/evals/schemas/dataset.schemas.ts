import { z } from "zod";

/** Mirrors backend ReviewSnippet / tool-io shape for eval datasets. */
export const EvalReviewSnippetSchema = z.object({
  text: z.string(),
  rating: z.number().min(0).max(5).optional(),
  source: z.string(),
  author: z.string().optional(),
  date: z.string().optional(),
});

/**
 * Inputs passed to the target (`summarizeReviews`) — must match LangSmith example.inputs.
 */
export const EvalExampleInputsSchema = z.object({
  restaurantName: z.string().min(1),
  snippets: z.array(EvalReviewSnippetSchema),
  language: z.string().optional(),
});

export const EvalRestaurantContextSchema = z.object({
  area: z.string(),
  cuisine: z.string(),
  priceLevel: z.number().int().min(1).max(4).optional(),
  rating: z.number().min(0).max(5).optional(),
  userRatingCount: z.number().int().nonnegative().optional(),
});

export const EvalUserQueryContextSchema = z.object({
  area: z.string(),
  cuisine: z.string(),
  budget: z.number().positive().optional(),
  preferences: z.array(z.string()).optional(),
  language: z.string().optional(),
});

/**
 * Example metadata for LangSmith (slicing / debugging). Kept JSON-serializable.
 */
export const EvalExampleMetadataSchema = z.object({
  difficulty: z.enum(["easy", "medium", "hard"]),
  scenario_tags: z.array(z.string()),
  expected_risk: z.string().optional(),
  label_notes: z.string().optional(),
  curation_source: z.enum(["manual", "production_trace", "hard_case"]),
  restaurant: EvalRestaurantContextSchema,
  userQuery: EvalUserQueryContextSchema.optional(),
});

export const EvalReferenceOutputSchema = z.object({
  reviewSummary: z.string(),
  positives: z.array(z.string()),
  complaints: z.array(z.string()),
  recommendedDishes: z.array(z.string()),
});

/**
 * One curated seed row (inputs + metadata + optional reference).
 */
export const EvalSeedRowSchema = z.object({
  inputs: EvalExampleInputsSchema,
  metadata: EvalExampleMetadataSchema,
  referenceOutput: EvalReferenceOutputSchema.optional(),
});

export type EvalExampleInputs = z.infer<typeof EvalExampleInputsSchema>;
export type EvalExampleMetadata = z.infer<typeof EvalExampleMetadataSchema>;
export type EvalSeedRow = z.infer<typeof EvalSeedRowSchema>;
export type EvalReviewSnippet = z.infer<typeof EvalReviewSnippetSchema>;
