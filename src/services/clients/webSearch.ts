import type {
  RestaurantCandidate,
  RestaurantSearchToolInput,
  RestaurantSearchToolOutput,
  RecipeCandidate,
  RecipeSearchToolInput,
  RecipeSearchToolOutput,
} from "../../shared/types/index.js";
import { TOOL_TIMEOUT_MS } from "../../shared/constants/index.js";

const TAVILY_API_BASE = "https://api.tavily.com";

interface TavilySearchResult {
  title: string;
  url: string;
  content?: string;
  score?: number;
}

interface TavilySearchResponse {
  results?: TavilySearchResult[];
  answer?: string;
}

export async function searchRestaurantsViaWeb(
  params: RestaurantSearchToolInput,
): Promise<RestaurantSearchToolOutput> {
  const apiKey = process.env["WEB_SEARCH_API_KEY"];
  if (!apiKey) {
    return { candidates: [], totalFound: 0 };
  }

  const response = await fetch(`${TAVILY_API_BASE}/search`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: apiKey,
      query: `best ${params.cuisine} restaurants in ${params.area}`,
      search_depth: "advanced",
      max_results: 10,
    }),
    signal: AbortSignal.timeout(TOOL_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`Tavily web search failed: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as TavilySearchResponse;
  const results = data.results ?? [];

  const candidates: RestaurantCandidate[] = results.map((result, index) => ({
    id: `ws-${index}-${Date.now()}`,
    name: result.title,
    area: params.area,
    cuisine: params.cuisine,
    priceLevel: undefined,
    rating: undefined,
    userRatingCount: undefined,
    address: undefined,
    sourceUrl: result.url,
    source: "web_search",
  }));

  return { candidates, totalFound: candidates.length };
}

export async function searchRecipesViaWeb(
  params: RecipeSearchToolInput,
): Promise<RecipeSearchToolOutput> {
  const apiKey = process.env["WEB_SEARCH_API_KEY"];
  if (!apiKey) {
    return { candidates: [], totalFound: 0 };
  }

  const response = await fetch(`${TAVILY_API_BASE}/search`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: apiKey,
      query: `${params.ingredients.join(" ")} 食谱 菜谱`,
      include_domains: ["xiachufang.com", "meishijie.com", "xiangha.com", "douguo.com"],
      max_results: params.maxResults,
    }),
    signal: AbortSignal.timeout(TOOL_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`Tavily recipe search failed: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as TavilySearchResponse;
  const results = data.results ?? [];

  const candidates: RecipeCandidate[] = results.map((result) => ({
    name: result.title,
    sourceUrl: result.url,
    source: new URL(result.url).hostname,
    snippet: result.content?.slice(0, 300),
    estimatedTime: undefined,
    difficulty: undefined,
  }));

  return { candidates, totalFound: candidates.length };
}
