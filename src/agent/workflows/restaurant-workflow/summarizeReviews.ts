import { z } from "zod";
import { basicModel } from "../../models/index.js";
import type { ReviewSnippet, ReviewSummary } from "../../../shared/types/index.js";

const ReviewSummarySchema = z.object({
  reviewSummary: z.string().describe("A 2-3 sentence overall summary of the restaurant based on reviews"),
  positives: z.array(z.string()).describe("Top positive aspects mentioned across reviews"),
  complaints: z.array(z.string()).describe("Common complaints or negative aspects mentioned in reviews"),
  recommendedDishes: z.array(z.string()).describe("Specific dishes that reviewers recommend"),
});

function getNoReviewsFallback(language?: string): ReviewSummary {
  const reviewSummary =
    language === "zh" ? "暂无评价。" : "No reviews available.";
  return {
    reviewSummary,
    positives: [],
    complaints: [],
    recommendedDishes: [],
  };
}

function getLanguageLabel(language?: string): string {
  if (!language || language === "en") return "English";
  if (language === "zh") return "Simplified Chinese";
  return language;
}

function buildLanguageConstraint(language?: string): string {
  if (!language || language === "en") return "";
  const label = getLanguageLabel(language);
  return `\n\nIMPORTANT: Write every string value in the JSON output (reviewSummary, each item in positives, each item in complaints, each item in recommendedDishes) in ${label}. Do not use any other language for those fields.`;
}

function summarizeFailureMessage(restaurantName: string, language?: string): string {
  if (language === "zh") {
    return `有评价内容，但无法为「${restaurantName}」生成摘要。`;
  }
  return `Reviews available but could not be summarized for ${restaurantName}.`;
}

export async function summarizeReviews(
  restaurantName: string,
  snippets: ReviewSnippet[],
  language?: string,
): Promise<ReviewSummary> {
  if (snippets.length === 0) return getNoReviewsFallback(language);

  const reviewTexts = snippets
    .map((s, i) => `Review ${i + 1} (Rating: ${s.rating ?? "N/A"}/5):\n${s.text}`)
    .join("\n\n");

  const structured = basicModel.withStructuredOutput(ReviewSummarySchema);

  const languageInstructionShort =
    language && language !== "en"
      ? ` Respond in ${getLanguageLabel(language)}.`
      : "";

  const languageConstraint = buildLanguageConstraint(language);

  try {
    const result = await structured.invoke([
      {
        role: "system",
        content: `You are a restaurant review analyst. Extract key themes from customer reviews concisely and accurately.${languageInstructionShort}`,
      },
      {
        role: "user",
        content: `Analyze these customer reviews for "${restaurantName}" and extract structured insights.

Reviews:
${reviewTexts}${languageConstraint}`,
      },
    ]);

    return result;
  } catch {
    return {
      reviewSummary: summarizeFailureMessage(restaurantName, language),
      positives: [],
      complaints: [],
      recommendedDishes: [],
    };
  }
}
