import { z } from "zod";

export const ConversationTurnSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string(),
  timestamp: z.number(),
});

export const RestaurantResultSummarySchema = z.object({
  name: z.string(),
  id: z.string(),
  score: z.number(),
});

export const SessionRestaurantQuerySchema = z.object({
  area: z.string(),
  cuisine: z.string(),
  budget: z.number().optional(),
  preferences: z.array(z.string()),
  language: z.string().optional(),
  currency: z.string().optional(),
});

export const PendingRestaurantQuerySchema = z.object({
  area: z.string(),
  areaEn: z.string().optional(),
  cuisine: z.string(),
  cuisineEn: z.string().optional(),
  language: z.string().optional(),
});

export const SessionDataSchema = z.object({
  id: z.string(),
  lastRestaurantQuery: SessionRestaurantQuerySchema.optional(),
  lastRestaurantResultSummary: z.array(RestaurantResultSummarySchema).optional(),
  pendingRestaurantQuery: PendingRestaurantQuerySchema.optional(),
  conversationHistory: z.array(ConversationTurnSchema),
  createdAt: z.number(),
  lastAccessedAt: z.number(),
});

export type ConversationTurn = z.infer<typeof ConversationTurnSchema>;
export type RestaurantResultSummary = z.infer<typeof RestaurantResultSummarySchema>;
export type SessionRestaurantQuery = z.infer<typeof SessionRestaurantQuerySchema>;
export type PendingRestaurantQuery = z.infer<typeof PendingRestaurantQuerySchema>;
export type SessionData = z.infer<typeof SessionDataSchema>;
