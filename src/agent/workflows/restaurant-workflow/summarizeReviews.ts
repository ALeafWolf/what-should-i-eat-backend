import { z } from "zod";
import { basicModel } from "../../models/index.js";
import type { ReviewSnippet, ReviewSummary } from "../../../shared/types/index.js";

const ReviewSummarySchema = z.object({
  reviewSummary: z.string().describe("A 2-3 sentence overall summary of the restaurant based on reviews"),
  positives: z.array(z.string()).describe("Top positive aspects mentioned across reviews"),
  complaints: z.array(z.string()).describe("Common complaints or negative aspects mentioned in reviews"),
  recommendedDishes: z.array(z.string()).describe("Specific dishes that reviewers recommend"),
});

const NO_REVIEWS_FALLBACK: ReviewSummary = {
  reviewSummary: "No reviews available.",
  positives: [],
  complaints: [],
  recommendedDishes: [],
};

export async function summarizeReviews(
  restaurantName: string,
  snippets: ReviewSnippet[],
): Promise<ReviewSummary> {
  if (snippets.length === 0) return NO_REVIEWS_FALLBACK;

  const reviewTexts = snippets
    .map((s, i) => `Review ${i + 1} (Rating: ${s.rating ?? "N/A"}/5):\n${s.text}`)
    .join("\n\n");

  const structured = basicModel.withStructuredOutput(ReviewSummarySchema);

  try {
    const result = await structured.invoke([
      {
        role: "system",
        content:
          "You are a restaurant review analyst. Extract key themes from customer reviews concisely and accurately.",
      },
      {
        role: "user",
        content: `Analyze these customer reviews for "${restaurantName}" and extract structured insights.

Reviews:
${reviewTexts}`,
      },
    ]);

    return result;
  } catch {
    return {
      reviewSummary: `Reviews available but could not be summarized for ${restaurantName}.`,
      positives: [],
      complaints: [],
      recommendedDishes: [],
    };
  }
}
