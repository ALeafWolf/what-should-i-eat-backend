import { z } from "zod";
import { traceable } from "langsmith/traceable";
import { routingModel } from "../models/index.js";
import type { SessionData } from "../../shared/types/index.js";
import { MAX_CONVERSATION_TURNS_FOR_CLASSIFICATION } from "../../shared/constants/index.js";

export const IntentResultSchema = z.object({
  intent: z.enum([
    "RESTAURANT_SEARCH",
    "RECIPE_SEARCH",
    "FOOD_QUESTION",
    "FUNCTION_INTRODUCTION",
    "OTHER",
  ]),
  language: z.string().describe("BCP 47 language code of the user input, e.g. 'en', 'zh', 'ja'"),
  restaurantFields: z
    .object({
      location: z.string().nullable().describe("The city, neighborhood, or area the user wants restaurants in. Extract only the core location name — do NOT include proximity qualifiers like '附近', '周边', '周围', 'nearby', 'near', 'around', 'close to'. For example: '温尼伯附近' → '温尼伯', 'near Miami' → 'Miami', 'around downtown Tokyo' → 'downtown Tokyo'"),
      locationEn: z.string().nullable().describe("The English equivalent of the location field. If location is already in English, repeat it here. If it is in another language, translate it to English. Examples: '温尼伯' → 'Winnipeg', '迈阿密' → 'Miami', '東京' → 'Tokyo', 'downtown Chicago' → 'downtown Chicago'. Return null if location is null"),
      cuisine: z.string().nullable().describe("Type of cuisine or food the user wants"),
      cuisineEn: z.string().nullable().describe("The English equivalent of the cuisine field. If cuisine is already in English, repeat it here. If it is in another language, translate it to English. Examples: '美式烧烤' → 'American BBQ', '中餐' → 'Chinese food'. Return null if cuisine is null"),
      pricePerPerson: z.number().nullable().describe("Budget per person as a number. Return null if the user did not mention a budget — do NOT default to 0. When a budget is given without a currency, use the local currency of the location (e.g. JPY for Tokyo, CNY for Beijing, USD for New York)"),
      currency: z.string().nullable().describe("ISO 4217 currency code for pricePerPerson (e.g. 'JPY', 'CNY', 'USD'). Only populate when pricePerPerson is non-null. Infer from the location when not stated by the user. Return null if pricePerPerson is null"),
      preferences: z.array(z.string()).nullable().describe("Specific, actionable preferences like 'outdoor seating', 'vegetarian', 'quiet atmosphere', 'romantic', 'family-friendly', 'parking available'. Do NOT include general quality descriptors like 'high-rated', 'good', 'popular', 'best', 'delicious', 'famous' — those are implicit in every search. Return null if the user did not mention any actionable preferences — do NOT return an empty array"),
    })
    .nullable()
    .describe("Populated only when intent is RESTAURANT_SEARCH, otherwise null"),
  foodQuestion: z
    .string()
    .nullable()
    .describe("The extracted food question to answer, populated only when intent is FOOD_QUESTION, otherwise null"),
});

export type IntentResult = z.infer<typeof IntentResultSchema>;

async function _classifyIntent(
  message: string,
  session: SessionData,
): Promise<IntentResult> {
  const recentTurns = session.conversationHistory.slice(-MAX_CONVERSATION_TURNS_FOR_CLASSIFICATION);
  const contextLines = recentTurns
    .map((t) => `${t.role === "user" ? "User" : "Assistant"}: ${t.content}`)
    .join("\n");

  const lastQuery = session.lastRestaurantQuery
    ? `Previous restaurant search: area="${session.lastRestaurantQuery.area}", cuisine="${session.lastRestaurantQuery.cuisine}"${
        session.lastRestaurantQuery.budget != null ? `, budget=${session.lastRestaurantQuery.budget}` : ""
      }${session.lastRestaurantQuery.currency ? `, currency=${session.lastRestaurantQuery.currency}` : ""}`
    : "";

  const lastResults = session.lastRestaurantResultSummary?.length
    ? `Previous results: ${session.lastRestaurantResultSummary.map((r) => r.name).join(", ")}`
    : "";

  const sessionContext = [lastQuery, lastResults].filter(Boolean).join("\n");

  const systemPrompt = `You are the routing and response agent for a food-related assistant.

Classify the user input into ONE of the following categories:

1. RESTAURANT_SEARCH
   - User wants to find restaurants
   - May include: location, cuisine, price per person, preferences
   - Also includes follow-ups like "show cheaper options", "find spicier ones", "something nearby" that refer to a prior restaurant search

2. RECIPE_SEARCH
   - User wants recipes or how to cook something

3. FOOD_QUESTION
   - User asks factual or general food-related questions
   - Examples: nutrition info, ingredient comparisons, cooking techniques, food history

4. FUNCTION_INTRODUCTION
   - User asks what this assistant can do, its features, or how to use it
   - Examples: "what can you do?", "how do you work?", "what features do you have?"

5. OTHER
   - Anything outside the above categories

For RESTAURANT_SEARCH, extract all available fields:
- location: core city or neighborhood name only — strip proximity qualifiers like "附近", "周边", "nearby", "near", "around" (e.g. "温尼伯附近" → "温尼伯", "near Miami" → "Miami")
- locationEn: English translation of location (e.g. "温尼伯" → "Winnipeg", "迈阿密" → "Miami"). If already in English, repeat it. Null if location is null
- cuisine: type of cuisine or food
- cuisineEn: English translation of cuisine (e.g. "美式烧烤" → "American BBQ", "中餐" → "Chinese food"). If already in English, repeat it. Null if cuisine is null
- pricePerPerson: numeric budget per person. Return null if the user did not mention a budget — do NOT default to 0. When a budget is given, use the local currency of the location if no currency is stated
- currency: ISO 4217 code (e.g. "JPY", "CNY", "USD"). Only set when pricePerPerson is non-null. Return null otherwise
- preferences: array of specific, actionable preferences (e.g. "outdoor seating", "vegetarian", "quiet", "family-friendly"). Do NOT include general quality words like "high-rated", "good", "popular", "best", "delicious" — these are implicit in every search. Return null if not mentioned — do NOT return an empty array

If the user refers to a prior search (e.g. "cheaper options", "something similar"), fill in missing fields from the session context below.

For FOOD_QUESTION, extract the specific question being asked.

Detect the language of the user input and return its BCP 47 code (e.g. "en", "zh", "ja", "ko", "fr").${
    sessionContext ? `\n\nSession context:\n${sessionContext}` : ""
  }${contextLines ? `\n\nRecent conversation:\n${contextLines}` : ""}`;

  const structured = routingModel.withStructuredOutput(IntentResultSchema);
  return structured.invoke([
    { role: "system", content: systemPrompt },
    { role: "user", content: message },
  ]);
}

export const classifyIntent = traceable(_classifyIntent, {
  name: "classifyIntent",
  run_type: "chain",
});
