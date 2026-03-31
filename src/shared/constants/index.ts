export const DEFAULT_PORT = 3001;

export const SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutes

export const MAX_TOOL_CALLS_PER_REQUEST = 10;

export const MAX_REVIEW_SNIPPETS_PER_RESTAURANT = 10;

export const MAX_RECIPE_RESULTS = 10;

export const MAX_RESTAURANT_CANDIDATES = 20;

export const MAX_PAGE_CONTENT_LENGTH = 8_000;

export const TOOL_TIMEOUT_MS = 10_000; // 10 seconds per tool call

export const DEFAULT_MAX_BUDGET = 999_999;

export const PRICE_LEVEL_MAP: Record<number, string> = {
  1: "$",
  2: "$$",
  3: "$$$",
  4: "$$$$",
};
