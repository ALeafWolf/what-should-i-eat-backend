import type { RestaurantCandidate, RestaurantSearchToolInput, RestaurantSearchToolOutput, RestaurantReviewsToolInput, RestaurantReviewsToolOutput } from "../../shared/types/index.js";

const GOOGLE_PLACES_API_BASE = "https://places.googleapis.com/v1";

function getApiKey(): string {
  const key = process.env["GOOGLE_PLACES_API_KEY"];
  if (!key) {
    throw new Error("GOOGLE_PLACES_API_KEY environment variable is not set");
  }
  return key;
}

/**
 * Searches for restaurants using the Google Places API (New).
 * Phase 2: replace mock data with real HTTP calls.
 */
export async function searchRestaurants(
  params: RestaurantSearchToolInput,
): Promise<RestaurantSearchToolOutput> {
  // TODO: Phase 2 - implement real Google Places Text Search API call
  // Reference: https://developers.google.com/maps/documentation/places/web-service/text-search
  //
  // Real implementation:
  //   POST ${GOOGLE_PLACES_API_BASE}/places:searchText
  //   Headers: { "X-Goog-Api-Key": getApiKey(), "X-Goog-FieldMask": "places.id,places.displayName,places.rating,..." }
  //   Body: { textQuery: `${params.cuisine} restaurants in ${params.area}`, ... }

  void getApiKey; // referenced in Phase 2
  void GOOGLE_PLACES_API_BASE;

  const mockCandidates: RestaurantCandidate[] = [
    {
      id: "mock-gp-001",
      name: "Mock Cantonese Restaurant",
      area: params.area,
      cuisine: params.cuisine,
      priceLevel: 2,
      rating: 4.3,
      userRatingCount: 256,
      address: `123 Mock Street, ${params.area}`,
      sourceUrl: "https://maps.google.com/mock-001",
      source: "google_places",
    },
    {
      id: "mock-gp-002",
      name: "Another Mock Eatery",
      area: params.area,
      cuisine: params.cuisine,
      priceLevel: 3,
      rating: 4.1,
      userRatingCount: 89,
      address: `456 Placeholder Ave, ${params.area}`,
      sourceUrl: "https://maps.google.com/mock-002",
      source: "google_places",
    },
  ];

  return {
    candidates: mockCandidates,
    totalFound: mockCandidates.length,
  };
}

/**
 * Fetches review snippets for a restaurant using the Google Places API (New).
 * Phase 2: replace mock data with real HTTP calls.
 */
export async function getPlaceReviews(
  params: RestaurantReviewsToolInput,
): Promise<RestaurantReviewsToolOutput> {
  // TODO: Phase 2 - implement real Google Places Details API call
  // Reference: https://developers.google.com/maps/documentation/places/web-service/place-details
  //
  // Real implementation:
  //   GET ${GOOGLE_PLACES_API_BASE}/places/${params.restaurantId}
  //   Headers: { "X-Goog-Api-Key": getApiKey(), "X-Goog-FieldMask": "reviews" }

  void getApiKey;

  return {
    restaurantId: params.restaurantId,
    snippets: [
      {
        text: `Mock positive review for ${params.restaurantName}. Great food and service!`,
        rating: 5,
        source: "google_places",
        author: "Mock Reviewer A",
        date: "2024-01-15",
      },
      {
        text: `Mock critical review for ${params.restaurantName}. Service was slow but food was decent.`,
        rating: 3,
        source: "google_places",
        author: "Mock Reviewer B",
        date: "2024-02-20",
      },
    ],
  };
}
