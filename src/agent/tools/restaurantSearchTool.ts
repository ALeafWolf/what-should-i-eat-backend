import { DynamicStructuredTool } from "@langchain/core/tools";
import { RestaurantSearchToolInputSchema } from "../schemas/tool-io.schemas.js";
import { searchRestaurants } from "../../services/clients/googlePlaces.js";
import { searchRestaurantsViaWeb } from "../../services/clients/webSearch.js";
import type { RestaurantSearchToolInput, RestaurantSearchToolOutput } from "../../shared/types/index.js";

const GOOGLE_PLACES_SUFFICIENT_THRESHOLD = 5;

export async function runRestaurantSearch(
  input: RestaurantSearchToolInput,
): Promise<RestaurantSearchToolOutput> {
  // Run Google Places first. Only fall back to web search when it returns
  // fewer than GOOGLE_PLACES_SUFFICIENT_THRESHOLD candidates, avoiding
  // Tavily API calls (and junk page-title candidates) when unnecessary.
  const googleResult = await searchRestaurants(input).catch(() => null);
  const googleCandidates = googleResult?.candidates ?? [];

  if (googleCandidates.length >= GOOGLE_PLACES_SUFFICIENT_THRESHOLD) {
    return { candidates: googleCandidates, totalFound: googleCandidates.length };
  }

  const webResult = await searchRestaurantsViaWeb(input).catch(() => null);
  const webCandidates = webResult?.candidates ?? [];

  const candidates = [...googleCandidates, ...webCandidates];
  return { candidates, totalFound: candidates.length };
}

export const restaurantSearchTool = new DynamicStructuredTool({
  name: "restaurantSearch",
  description:
    "Search for restaurants using Google Places and web search. Returns a merged list of restaurant candidates with ratings, price levels, and addresses.",
  schema: RestaurantSearchToolInputSchema,
  func: async (input) => {
    const result = await runRestaurantSearch(input);
    return JSON.stringify(result);
  },
});
