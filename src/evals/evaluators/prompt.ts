import type { EvalExampleInputs, EvalExampleMetadata } from "../schemas/dataset.schemas.js";
import type { ReviewSummary } from "../../shared/types/index.js";

function formatReviewSnippetsForJudge(snippets: EvalExampleInputs["snippets"]): string {
  return snippets
    .map((s, i) => {
      const meta = [
        s.rating != null ? `rating ${s.rating}/5` : null,
        s.source ? `source ${s.source}` : null,
        s.date ? `date ${s.date}` : null,
      ]
        .filter(Boolean)
        .join(", ");
      return `Review ${i + 1}${meta ? ` (${meta})` : ""}:\n${s.text}`;
    })
    .join("\n\n");
}

function formatMetadataBlock(metadata: EvalExampleMetadata | undefined): string {
  if (!metadata) return "(No extra dataset metadata.)";
  const lines: string[] = [
    `Difficulty: ${metadata.difficulty}`,
    `Scenario tags: ${metadata.scenario_tags.join(", ") || "(none)"}`,
    `Curation source: ${metadata.curation_source}`,
    `Restaurant context: ${metadata.restaurant.area}, ${metadata.restaurant.cuisine}` +
      (metadata.restaurant.priceLevel != null ? `, price level ${metadata.restaurant.priceLevel}` : "") +
      (metadata.restaurant.rating != null ? `, place rating ~${metadata.restaurant.rating}` : "") +
      (metadata.restaurant.userRatingCount != null
        ? `, ~${metadata.restaurant.userRatingCount} Google ratings`
        : ""),
  ];
  if (metadata.userQuery) {
    lines.push(
      `User query context: area=${metadata.userQuery.area}, cuisine=${metadata.userQuery.cuisine}` +
        (metadata.userQuery.budget != null ? `, budget ~${metadata.userQuery.budget}` : "") +
        (metadata.userQuery.language ? `, language=${metadata.userQuery.language}` : "") +
        (metadata.userQuery.preferences?.length
          ? `, preferences: ${metadata.userQuery.preferences.join("; ")}`
          : ""),
    );
  }
  if (metadata.expected_risk) lines.push(`Expected risk (label): ${metadata.expected_risk}`);
  if (metadata.label_notes) lines.push(`Label notes: ${metadata.label_notes}`);
  return lines.join("\n");
}

function formatGeneratedOutput(output: ReviewSummary): string {
  return JSON.stringify(
    {
      reviewSummary: output.reviewSummary,
      positives: output.positives,
      complaints: output.complaints,
      recommendedDishes: output.recommendedDishes,
    },
    null,
    2,
  );
}

const JUDGE_SYSTEM = `You are evaluating whether a restaurant review summary is faithful to the provided evidence.

You will receive:
1. Restaurant name and optional language
2. Optional dataset metadata (for context only — do NOT treat it as review evidence)
3. Raw review snippets that were the ONLY evidence the summarizer should have used
4. The generated output: reviewSummary, positives, complaints, recommendedDishes

Your job:
Evaluate whether the generated output is grounded in the review evidence and is not misleading.

Important rules:
- Use ONLY the provided review snippets as evidence.
- Do NOT use outside knowledge.
- A claim is unsupported if it is not clearly backed by the reviews.
- Penalize overgeneralization (e.g. "everyone loves the service" when only 1-2 reviews mention it).
- Penalize hiding disagreement: if reviews are mixed, the output should reflect nuance.
- Penalize omission of major caveats that matter for a dining decision.
- Check whether each item in positives vs complaints is classified correctly.
- For recommendedDishes: each dish should appear in the review text (or be an obvious synonym). Invented dishes are a serious failure.
- Reward summaries that accurately preserve uncertainty and mixed opinions.

Scoring rubric (1-5 integers):
- faithfulness_score: claims in reviewSummary, positives, and complaints supported by snippets
- consensus_accuracy_score: strength of evidence represented correctly (majority vs mixed vs isolated)
- balance_score: fair reflection of positives and negatives when evidence is mixed
- coverage_score: important decision-useful themes from reviews are captured
- positives_complaints_classification_score: items in the right list
- dish_recommendation_score: recommendedDishes grounded in review text

Set final_pass to true only if ALL of the following hold:
faithfulness_score >= 4, consensus_accuracy_score >= 4, dish_recommendation_score >= 4,
misleading_overall is false, overstates_consensus is false.

Return valid JSON matching the schema exactly (no markdown).`;

export function buildJudgeUserContent(args: {
  inputs: EvalExampleInputs;
  outputs: ReviewSummary;
  metadata?: EvalExampleMetadata;
  referenceOutputs?: ReviewSummary | undefined;
}): string {
  const { inputs, outputs, metadata, referenceOutputs } = args;
  const lang = inputs.language && inputs.language !== "en" ? inputs.language : "en";
  const parts: string[] = [
    `Restaurant name: ${inputs.restaurantName}`,
    `Output language hint (BCP 47 / app convention): ${lang}`,
    "",
    "--- Dataset metadata (not evidence) ---",
    formatMetadataBlock(metadata),
    "",
    "--- Review snippets (sole evidence) ---",
    formatReviewSnippetsForJudge(inputs.snippets),
    "",
    "--- Generated output to judge ---",
    formatGeneratedOutput(outputs),
  ];
  if (referenceOutputs) {
    parts.push(
      "",
      "--- Optional human reference output (calibration only; not mandatory match) ---",
      formatGeneratedOutput(referenceOutputs),
    );
  }
  return parts.join("\n");
}

export const RESTAURANT_SUMMARY_GROUNDEDNESS_V1_SYSTEM = JUDGE_SYSTEM;
