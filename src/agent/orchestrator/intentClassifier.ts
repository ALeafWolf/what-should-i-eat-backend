import { z } from "zod";
import { traceable } from "langsmith/traceable";
import { routingModel } from "../models/index.js";
import type { SessionData } from "../../shared/types/index.js";
import { MAX_CONVERSATION_TURNS_FOR_CLASSIFICATION } from "../../shared/constants/index.js";

export const IntentResultSchema = z.object({
  intent: z.enum(["RESTAURANT_SEARCH", "RECIPE_SEARCH", "FOOD_QUESTION", "OTHER"]),
  language: z.string().describe("BCP 47 language code of the user input, e.g. 'en', 'zh', 'ja'"),
  restaurantFields: z
    .object({
      location: z.string().nullable().describe("Area, city, or neighborhood the user wants restaurants in"),
      cuisine: z.string().nullable().describe("Type of cuisine or food the user wants"),
      pricePerPerson: z.number().nullable().describe("Budget per person as a number. Return null if the user did not mention a budget — do NOT default to 0. When a budget is given without a currency, use the local currency of the location (e.g. JPY for Tokyo, CNY for Beijing, USD for New York)"),
      currency: z.string().nullable().describe("ISO 4217 currency code for pricePerPerson (e.g. 'JPY', 'CNY', 'USD'). Only populate when pricePerPerson is non-null. Infer from the location when not stated by the user. Return null if pricePerPerson is null"),
      preferences: z.array(z.string()).nullable().describe("Extra preferences like 'outdoor seating', 'vegetarian'. Return null if the user did not mention any preferences — do NOT return an empty array"),
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

4. OTHER
   - Anything outside the above categories

For RESTAURANT_SEARCH, extract all available fields:
- location: area, city, or neighborhood
- cuisine: type of cuisine or food
- pricePerPerson: numeric budget per person. Return null if the user did not mention a budget — do NOT default to 0. When a budget is given, use the local currency of the location if no currency is stated
- currency: ISO 4217 code (e.g. "JPY", "CNY", "USD"). Only set when pricePerPerson is non-null. Return null otherwise
- preferences: array of extra preferences. Return null if not mentioned — do NOT return an empty array

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
