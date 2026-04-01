import { DynamicStructuredTool } from "@langchain/core/tools";
import { RestaurantSearchToolInputSchema } from "../schemas/tool-io.schemas.js";
import { searchRestaurants } from "../../services/clients/googlePlaces.js";
import { searchRestaurantsViaWeb } from "../../services/clients/webSearch.js";
import type { RestaurantSearchToolInput, RestaurantSearchToolOutput } from "../../shared/types/index.js";

export async function runRestaurantSearch(
  input: RestaurantSearchToolInput,
): Promise<RestaurantSearchToolOutput> {
  const [googleResult, webResult] = await Promise.allSettled([
    searchRestaurants(input),
    searchRestaurantsViaWeb(input),
  ]);

  const candidates = [
    ...(googleResult.status === "fulfilled" ? googleResult.value.candidates : []),
    ...(webResult.status === "fulfilled" ? webResult.value.candidates : []),
  ];

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
