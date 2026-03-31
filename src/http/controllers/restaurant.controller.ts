import type { Request, Response, NextFunction } from "express";
import type { RestaurantSearchRequest } from "../../shared/types/index.js";
import { normalizeRestaurantQuery } from "../../agent/pipeline/normalize/normalizeRestaurantQuery.js";
import { dedupRestaurants } from "../../agent/pipeline/dedup/dedupRestaurants.js";
import { rankRestaurants } from "../../agent/pipeline/ranking/rankRestaurants.js";
import { buildRestaurantResponse } from "../../agent/pipeline/formatting/buildRestaurantResponse.js";
import { searchRestaurants as googlePlacesSearch } from "../../services/clients/googlePlaces.js";
import { searchRestaurantsViaWeb } from "../../services/clients/webSearch.js";

export async function searchRestaurants(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const body = req.body as RestaurantSearchRequest;

    // Phase 1: pipeline wired with mock client data
    // Phase 2: replace with real workflow orchestrator
    const normalized = normalizeRestaurantQuery(body);

    const [googleResult, webResult] = await Promise.allSettled([
      googlePlacesSearch({
        area: normalized.area,
        cuisine: normalized.cuisine,
        budget: normalized.budget,
        preferences: normalized.preferences,
      }),
      searchRestaurantsViaWeb({
        area: normalized.area,
        cuisine: normalized.cuisine,
        budget: normalized.budget,
        preferences: normalized.preferences,
      }),
    ]);

    const allCandidates = [
      ...(googleResult.status === "fulfilled" ? googleResult.value.candidates : []),
      ...(webResult.status === "fulfilled" ? webResult.value.candidates : []),
    ];

    const deduped = dedupRestaurants(allCandidates);
    const ranked = rankRestaurants(deduped, normalized);
    const response = buildRestaurantResponse(ranked);

    res.json(response);
  } catch (err) {
    next(err);
  }
}
