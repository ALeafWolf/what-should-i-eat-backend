import { traceable } from "langsmith/traceable";
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

async function _runRestaurantWorkflow(
  input: RestaurantSearchRequest,
  emit: WorkflowEmitter,
  signal?: AbortSignal,
): Promise<RestaurantResponse> {
  let activeStepId: string | null = null;

  function startStep(stepId: string, label: string) {
    emit({ type: "step_start", stepId, label });
    activeStepId = stepId;
  }

  function endStep(stepId: string) {
    emit({ type: "step_done", stepId });
    if (activeStepId === stepId) {
      activeStepId = null;
    }
  }

  try {
    // 1. Normalize query
    startStep("normalize", "Normalizing query");
    const normalized = normalizeRestaurantQuery(input);
    endStep("normalize");

    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

    // 2. Search (Google Places + web search in parallel, with fallback)
    startStep("search", "Searching restaurants");
    let candidates: RestaurantCandidate[];
    let webSearchFailed = false;

    try {
      const searchResult = await runRestaurantSearch({
        area: normalized.area,
        areaEn: normalized.areaEn,
        cuisine: normalized.cuisine,
        cuisineEn: normalized.cuisineEn,
        budget: normalized.budget,
        preferences: normalized.preferences,
        language: normalized.language,
      });
      candidates = searchResult.candidates;

      if (!process.env["WEB_SEARCH_API_KEY"]) {
        webSearchFailed = true;
      }
    } catch {
      candidates = [];
      webSearchFailed = true;
    }

    endStep("search");

    if (webSearchFailed) {
      emit({ type: "warning", message: "Web search unavailable, using Google Places only" });
    }

    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

    // 3. Dedup merged candidates and drop any unmatched web-search page titles.
    // Web-search results whose names didn't match a Google Places entry are
    // article/list titles (e.g. "Best Thai in GTA – Page 2"), not restaurants.
    // Candidates that did match a Google Places entry were already replaced by
    // the Google Places version during dedup, so this filter is safe.
    startStep("dedup", "Deduplicating results");
    const deduped = dedupRestaurants(candidates).filter(
      (c) => c.source !== "web_search",
    );

    endStep("dedup");

    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

    // 4 & 5. Fetch reviews and summarize in batches (capped concurrency)
    startStep(
      "reviews",
      deduped.length
        ? `Fetching & summarizing reviews (${deduped.length} restaurants)`
        : "Fetching & summarizing reviews",
    );
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

      const summaryResults = await Promise.allSettled(
        batch.map((candidate, idx) => {
          const reviewResult = reviewResults[idx]!;
          const snippets =
            reviewResult.status === "fulfilled" ? reviewResult.value.snippets : [];
          return summarizeReviews(candidate.name, snippets, normalized.language).then((summary) => ({
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

    endStep("reviews");

    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

    // 6. Rank
    startStep("rank", "Ranking results");
    const ranked = rankRestaurants(deduped, normalized, reviewData);
    endStep("rank");

    // 7. Build and return response
    const response = buildRestaurantResponse(ranked);
    emit({ type: "done", data: response });
    return response;
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw err;
    }
    const message = err instanceof Error ? err.message : String(err);
    if (activeStepId) {
      emit({ type: "step_error", stepId: activeStepId, message });
    }
    emit({ type: "error", message, code: "WORKFLOW_ERROR" });
    throw err;
  }
}

export const runRestaurantWorkflow = traceable(_runRestaurantWorkflow, {
  name: "runRestaurantWorkflow",
  run_type: "chain",
});
