import type {
  RestaurantSearchRequest,
  RestaurantResponse,
  WorkflowEmitter,
  RestaurantCandidate,
} from "../../../shared/types/index.js";
import { normalizeRestaurantQuery } from "../../pipeline/normalize/normalizeRestaurantQuery.js";
import { dedupRestaurants } from "../../pipeline/dedup/dedupRestaurants.js";
import { rankRestaurants, type RestaurantReviewData } from "../../pipeline/ranking/rankRestaurants.js";
import { buildRestaurantResponse } from "../../pipeline/formatting/buildRestaurantResponse.js";
import { runRestaurantSearch } from "../../tools/restaurantSearchTool.js";
import { runRestaurantReviews } from "../../tools/restaurantReviewsTool.js";
import { summarizeReviews } from "./summarizeReviews.js";

const MAX_CONCURRENT_REVIEWS = 5;

export async function runRestaurantWorkflow(
  input: RestaurantSearchRequest,
  emit: WorkflowEmitter,
  signal?: AbortSignal,
): Promise<RestaurantResponse> {
  try {
    // 1. Normalize query
    emit({ type: "status", message: "Normalizing query..." });
    const normalized = normalizeRestaurantQuery(input);

    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

    // 2. Search (Google Places + web search in parallel, with fallback)
    emit({ type: "status", message: "Searching restaurants..." });
    let candidates: RestaurantCandidate[];
    let webSearchFailed = false;

    try {
      const searchResult = await runRestaurantSearch({
        area: normalized.area,
        cuisine: normalized.cuisine,
        budget: normalized.budget,
        preferences: normalized.preferences,
      });
      candidates = searchResult.candidates;

      if (!process.env["WEB_SEARCH_API_KEY"]) {
        webSearchFailed = true;
      }
    } catch {
      candidates = [];
      webSearchFailed = true;
    }

    if (webSearchFailed) {
      emit({ type: "warning", message: "Web search unavailable, using Google Places only" });
    }

    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

    // 3. Dedup merged candidates
    emit({ type: "status", message: "Deduplicating candidates..." });
    const deduped = dedupRestaurants(candidates);

    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

    // 4 & 5. Fetch reviews and summarize in batches (capped concurrency)
    emit({ type: "status", message: `Fetching reviews for ${deduped.length} restaurants...` });
    const reviewData = new Map<string, RestaurantReviewData>();

    for (let i = 0; i < deduped.length; i += MAX_CONCURRENT_REVIEWS) {
      if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

      const batch = deduped.slice(i, i + MAX_CONCURRENT_REVIEWS);

      const reviewResults = await Promise.allSettled(
        batch.map((c) =>
          runRestaurantReviews({
            restaurantId: c.id,
            restaurantName: c.name,
            maxSnippets: 10,
          }),
        ),
      );

      for (let j = 0; j < batch.length; j++) {
        if (reviewResults[j]!.status === "rejected") {
          emit({ type: "warning", message: `Reviews unavailable for ${batch[j]!.name}` });
        }
      }

      emit({ type: "status", message: "Summarizing reviews..." });

      const summaryResults = await Promise.allSettled(
        batch.map((candidate, idx) => {
          const reviewResult = reviewResults[idx]!;
          const snippets =
            reviewResult.status === "fulfilled" ? reviewResult.value.snippets : [];
          return summarizeReviews(candidate.name, snippets).then((summary) => ({
            id: candidate.id,
            snippets,
            summary,
          }));
        }),
      );

      for (let j = 0; j < summaryResults.length; j++) {
        const sr = summaryResults[j]!;
        if (sr.status === "fulfilled") {
          reviewData.set(sr.value.id, {
            snippets: sr.value.snippets,
            summary: sr.value.summary,
          });
        } else {
          emit({ type: "warning", message: `Review summarization failed for ${batch[j]!.name}` });
        }
      }
    }

    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

    // 6. Rank
    emit({ type: "status", message: "Ranking results..." });
    const ranked = rankRestaurants(deduped, normalized, reviewData);

    // 7. Build and return response
    const response = buildRestaurantResponse(ranked);
    emit({ type: "done", data: response });
    return response;
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw err;
    }
    const message = err instanceof Error ? err.message : String(err);
    emit({ type: "error", message, code: "WORKFLOW_ERROR" });
    throw err;
  }
}
