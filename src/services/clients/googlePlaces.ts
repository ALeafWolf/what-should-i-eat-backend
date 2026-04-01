import type {
  RestaurantCandidate,
  RestaurantSearchToolInput,
  RestaurantSearchToolOutput,
  RestaurantReviewsToolInput,
  RestaurantReviewsToolOutput,
  ReviewSnippet,
} from "../../shared/types/index.js";
import { TOOL_TIMEOUT_MS, MAX_REVIEW_SNIPPETS_PER_RESTAURANT } from "../../shared/constants/index.js";

const GOOGLE_PLACES_API_BASE = "https://places.googleapis.com/v1";

interface GooglePlaceResult {
  id: string;
  displayName?: { text: string; languageCode: string };
  rating?: number;
  userRatingCount?: number;
  priceLevel?: string;
  formattedAddress?: string;
  websiteUri?: string;
  googleMapsUri?: string;
}

interface GooglePlaceReview {
  rating: number;
  text?: { text: string; languageCode: string };
  originalText?: { text: string; languageCode: string };
  authorAttribution?: { displayName: string; uri: string; photoUri: string };
  publishTime?: string;
}

const GOOGLE_PRICE_LEVEL: Record<string, number> = {
  PRICE_LEVEL_FREE: 1,
  PRICE_LEVEL_INEXPENSIVE: 1,
  PRICE_LEVEL_MODERATE: 2,
  PRICE_LEVEL_EXPENSIVE: 3,
  PRICE_LEVEL_VERY_EXPENSIVE: 4,
};

function getApiKey(): string {
  const key = process.env["GOOGLE_PLACES_API_KEY"];
  if (!key) throw new Error("GOOGLE_PLACES_API_KEY environment variable is not set");
  return key;
}

function parsePriceLevel(level: string | undefined): number | undefined {
  if (!level) return undefined;
  return GOOGLE_PRICE_LEVEL[level];
}

export async function searchRestaurants(
  params: RestaurantSearchToolInput,
): Promise<RestaurantSearchToolOutput> {
  const apiKey = getApiKey();

  const response = await fetch(`${GOOGLE_PLACES_API_BASE}/places:searchText`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask":
        "places.id,places.displayName,places.rating,places.userRatingCount,places.priceLevel,places.formattedAddress,places.websiteUri,places.googleMapsUri",
    },
    body: JSON.stringify({
      textQuery: `${params.cuisine} restaurants in ${params.area}`,
      maxResultCount: 20,
      languageCode: "en",
    }),
    signal: AbortSignal.timeout(TOOL_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`Google Places Text Search failed: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as { places?: GooglePlaceResult[] };
  const places = data.places ?? [];

  const candidates: RestaurantCandidate[] = places.map((place) => ({
    id: place.id,
    name: place.displayName?.text ?? place.id,
    area: params.area,
    cuisine: params.cuisine,
    priceLevel: parsePriceLevel(place.priceLevel),
    rating: place.rating,
    userRatingCount: place.userRatingCount,
    address: place.formattedAddress,
    sourceUrl: place.googleMapsUri ?? place.websiteUri,
    source: "google_places",
  }));

  return { candidates, totalFound: candidates.length };
}

export async function getPlaceReviews(
  params: RestaurantReviewsToolInput,
): Promise<RestaurantReviewsToolOutput> {
  const apiKey = getApiKey();

  const response = await fetch(`${GOOGLE_PLACES_API_BASE}/places/${params.restaurantId}`, {
    headers: {
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": "reviews",
    },
    signal: AbortSignal.timeout(TOOL_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`Google Places Details failed: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as { reviews?: GooglePlaceReview[] };
  const reviews = data.reviews ?? [];

  const snippets: ReviewSnippet[] = reviews
    .slice(0, params.maxSnippets ?? MAX_REVIEW_SNIPPETS_PER_RESTAURANT)
    .map((review) => ({
      text: review.text?.text ?? review.originalText?.text ?? "",
      rating: review.rating,
      source: "google_places",
      author: review.authorAttribution?.displayName,
      date: review.publishTime,
    }));

  return { restaurantId: params.restaurantId, snippets };
}
