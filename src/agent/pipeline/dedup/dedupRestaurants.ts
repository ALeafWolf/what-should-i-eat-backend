import type { RestaurantCandidate } from "../../../shared/types/index.js";

function normalizeKey(name: string, area: string): string {
  const normalizedName = name
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return `${normalizedName}:${area.toLowerCase().trim()}`;
}

export function dedupRestaurants(candidates: RestaurantCandidate[]): RestaurantCandidate[] {
  const seen = new Map<string, RestaurantCandidate>();

  for (const candidate of candidates) {
    const key = normalizeKey(candidate.name, candidate.area);
    const existing = seen.get(key);

    if (!existing) {
      seen.set(key, candidate);
    } else if (candidate.source === "google_places" && existing.source !== "google_places") {
      seen.set(key, candidate);
    }
  }

  return Array.from(seen.values());
}
