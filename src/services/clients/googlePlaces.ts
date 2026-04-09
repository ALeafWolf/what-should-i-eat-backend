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

interface GoogleMoney {
  currencyCode?: string;
  units?: string;
  nanos?: number;
}

interface GooglePriceRange {
  startPrice?: GoogleMoney;
  endPrice?: GoogleMoney;
}

/** https://developers.google.com/maps/documentation/places/web-service/reference/rest/v1/places#AddressComponent */
interface GoogleAddressComponent {
  longText?: string;
  shortText?: string;
  types?: string[];
  languageCode?: string;
}

/** https://developers.google.com/maps/documentation/places/web-service/reference/rest/v1/places#PostalAddress */
interface GooglePostalAddress {
  locality?: string;
  sublocality?: string;
  administrativeArea?: string;
  regionCode?: string;
}

interface GooglePlaceResult {
  id: string;
  displayName?: { text: string; languageCode: string };
  primaryTypeDisplayName?: { text: string; languageCode: string };
  rating?: number;
  userRatingCount?: number;
  priceLevel?: string;
  priceRange?: GooglePriceRange;
  formattedAddress?: string;
  /** Structured city / province fields from the Places API (preferred for display). */
  postalAddress?: GooglePostalAddress;
  addressComponents?: GoogleAddressComponent[];
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

function moneyToNumber(m?: GoogleMoney): number | undefined {
  if (!m) return undefined;
  const hasUnits = m.units !== undefined && m.units !== "";
  const hasNanos = m.nanos !== undefined && m.nanos !== 0;
  if (!hasUnits && !hasNanos) return undefined;
  const whole = hasUnits ? Number(m.units) : 0;
  if (!Number.isFinite(whole)) return undefined;
  const frac = (m.nanos ?? 0) / 1e9;
  return whole + frac;
}

function formatMoneyDisplay(m?: GoogleMoney): string | undefined {
  if (!m?.currencyCode) return undefined;
  const amount = moneyToNumber(m);
  if (amount === undefined) return undefined;
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: m.currencyCode,
      maximumFractionDigits: m.currencyCode === "JPY" || m.currencyCode === "KRW" ? 0 : 2,
    }).format(amount);
  } catch {
    return `${m.currencyCode} ${amount}`;
  }
}

function formatPriceRangeFromApi(priceRange?: GooglePriceRange): string | undefined {
  if (!priceRange) return undefined;
  const start = formatMoneyDisplay(priceRange.startPrice);
  const end = formatMoneyDisplay(priceRange.endPrice);
  if (start && end) return `${start} – ${end}`;
  if (start) return start;
  if (end) return end;
  return undefined;
}

function firstAddressComponent(
  components: GoogleAddressComponent[] | undefined,
  typeNames: string[],
): GoogleAddressComponent | undefined {
  if (!components?.length) return undefined;
  for (const typeName of typeNames) {
    const found = components.find((c) => c.types?.includes(typeName));
    if (found) return found;
  }
  return undefined;
}

/**
 * "City, Province" from Places API (New) structured fields:
 * postalAddress.locality + administrativeArea, with addressComponents fallback.
 * https://developers.google.com/maps/documentation/places/web-service/reference/rest/v1/places
 */
function areaFromPlaceStructured(place: GooglePlaceResult, fallback: string): string {
  const postal = place.postalAddress;
  const comps = place.addressComponents;

  let locality =
    postal?.locality?.trim() ||
    firstAddressComponent(comps, ["locality", "postal_town"])?.longText?.trim() ||
    firstAddressComponent(comps, ["locality", "postal_town"])?.shortText?.trim();

  if (!locality && postal?.sublocality?.trim()) {
    locality = postal.sublocality.trim();
  }
  if (!locality) {
    const sub = firstAddressComponent(comps, ["sublocality", "sublocality_level_1"]);
    locality = sub?.longText?.trim() || sub?.shortText?.trim();
  }

  const adminComp = firstAddressComponent(comps, ["administrative_area_level_1"]);
  let province = postal?.administrativeArea?.trim();
  if (!province) {
    province =
      adminComp?.shortText && /^[A-Z]{2}$/i.test(adminComp.shortText)
        ? adminComp.shortText.toUpperCase()
        : adminComp?.longText?.trim() || adminComp?.shortText?.trim();
  } else if (adminComp?.shortText && /^[A-Z]{2}$/i.test(adminComp.shortText)) {
    province = adminComp.shortText.toUpperCase();
  }

  if (locality && province) return `${locality}, ${province}`;
  if (locality) return locality;
  if (province) return province;
  return fallback;
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
        "places.id,places.displayName,places.primaryTypeDisplayName,places.rating,places.userRatingCount,places.priceLevel,places.priceRange,places.formattedAddress,places.postalAddress,places.addressComponents,places.websiteUri,places.googleMapsUri",
    },
    body: JSON.stringify({
      textQuery: `${params.cuisineEn ?? params.cuisine} restaurants in ${params.areaEn ?? params.area}`,
      maxResultCount: 20,
      languageCode: params.language ?? "en",
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
    area: areaFromPlaceStructured(place, params.area),
    cuisine: place.primaryTypeDisplayName?.text ?? params.cuisine,
    priceLevel: parsePriceLevel(place.priceLevel),
    displayPriceRange: formatPriceRangeFromApi(place.priceRange),
    rating: place.rating,
    userRatingCount: place.userRatingCount,
    address: place.formattedAddress,
    sourceUrl: place.googleMapsUri ?? place.websiteUri,
    googleMapsUrl: place.googleMapsUri,
    websiteUrl: place.websiteUri,
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
