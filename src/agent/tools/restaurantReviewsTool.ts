import { DynamicStructuredTool } from "@langchain/core/tools";
import { traceable } from "langsmith/traceable";
import { RestaurantReviewsToolInputSchema } from "../schemas/tool-io.schemas.js";
import { getPlaceReviews } from "../../services/clients/googlePlaces.js";
import type { RestaurantReviewsToolInput, RestaurantReviewsToolOutput } from "../../shared/types/index.js";

async function _runRestaurantReviews(
  input: RestaurantReviewsToolInput,
): Promise<RestaurantReviewsToolOutput> {
  return getPlaceReviews(input);
}

export const runRestaurantReviews = traceable(_runRestaurantReviews, {
  name: "restaurantReviews",
  run_type: "tool",
});

export const restaurantReviewsTool = new DynamicStructuredTool({
  name: "restaurantReviews",
  description:
    "Fetch review snippets for a specific restaurant using Google Places. Returns review text, star ratings, author, and date.",
  schema: RestaurantReviewsToolInputSchema,
  func: async (input) => {
    const result = await runRestaurantReviews(input);
    return JSON.stringify(result);
  },
});
