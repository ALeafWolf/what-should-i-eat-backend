import type { RestaurantCandidate, RestaurantSearchToolInput, RestaurantSearchToolOutput, RecipeCandidate, RecipeSearchToolInput, RecipeSearchToolOutput } from "../../shared/types/index.js";

const TAVILY_API_BASE = "https://api.tavily.com";

function getApiKey(): string {
  const key = process.env["WEB_SEARCH_API_KEY"];
  if (!key) {
    throw new Error("WEB_SEARCH_API_KEY environment variable is not set");
  }
  return key;
}

/**
 * Searches for restaurants using the web search API (Tavily/SerpAPI).
 * Used as a fallback or complement to Google Places.
 * Phase 2: replace mock data with real Tavily API calls.
 */
export async function searchRestaurantsViaWeb(
  params: RestaurantSearchToolInput,
): Promise<RestaurantSearchToolOutput> {
  // TODO: Phase 2 - implement real Tavily search API call
  // Reference: https://docs.tavily.com/docs/tavily-api/search
  //
  // Real implementation:
  //   POST ${TAVILY_API_BASE}/search
  //   Headers: { "Content-Type": "application/json" }
  //   Body: {
  //     api_key: getApiKey(),
  //     query: `best ${params.cuisine} restaurants in ${params.area}`,
  //     search_depth: "advanced",
  //     max_results: 10,
  //   }

  void getApiKey;
  void TAVILY_API_BASE;

  const mockCandidates: RestaurantCandidate[] = [
    {
      id: "mock-ws-001",
      name: "Web Search Mock Restaurant",
      area: params.area,
      cuisine: params.cuisine,
      priceLevel: 2,
      rating: 4.0,
      userRatingCount: 42,
      address: `789 Search Result Blvd, ${params.area}`,
      sourceUrl: "https://www.example-review-site.com/mock-restaurant",
      source: "web_search",
    },
  ];

  return {
    candidates: mockCandidates,
    totalFound: mockCandidates.length,
  };
}

/**
 * Searches for Chinese recipes using the web search API (Tavily/SerpAPI).
 * Phase 6: replace mock data with real Tavily API calls targeting recipe sites.
 */
export async function searchRecipesViaWeb(
  params: RecipeSearchToolInput,
): Promise<RecipeSearchToolOutput> {
  // TODO: Phase 6 - implement real Tavily search API call for recipe sources
  // Target sites: xiachufang.com, meishijie.com, xiangha.com, douguo.com
  //
  // Real implementation:
  //   POST ${TAVILY_API_BASE}/search
  //   Body: {
  //     api_key: getApiKey(),
  //     query: `${params.ingredients.join(" ")} 食谱 菜谱`,
  //     include_domains: ["xiachufang.com", "meishijie.com", "xiangha.com", "douguo.com"],
  //     max_results: params.maxResults,
  //   }

  void getApiKey;

  const ingredientList = params.ingredients.join(", ");

  const mockCandidates: RecipeCandidate[] = [
    {
      name: `Mock Recipe with ${ingredientList}`,
      sourceUrl: "https://www.xiachufang.com/recipe/mock-001/",
      source: "xiachufang.com",
      snippet: `A delicious recipe using ${ingredientList}. Easy to prepare and very flavorful.`,
      estimatedTime: "30 minutes",
      difficulty: "easy",
    },
  ];

  return {
    candidates: mockCandidates,
    totalFound: mockCandidates.length,
  };
}
