import { z } from "zod";

/**
 * Structured LLM-as-judge output for restaurant_summary_groundedness_v1.
 */
export const RestaurantSummaryGroundednessJudgeSchema = z.object({
  faithfulness_score: z.number().int().min(1).max(5),
  consensus_accuracy_score: z.number().int().min(1).max(5),
  balance_score: z.number().int().min(1).max(5),
  coverage_score: z.number().int().min(1).max(5),
  positives_complaints_classification_score: z.number().int().min(1).max(5),
  dish_recommendation_score: z.number().int().min(1).max(5),
  misleading_overall: z.boolean(),
  has_unsupported_positive_claim: z.boolean(),
  has_unsupported_negative_claim: z.boolean(),
  overstates_consensus: z.boolean(),
  omits_major_caveat: z.boolean(),
  unsupported_claims: z.array(z.string()),
  missed_major_points: z.array(z.string()),
  evidence_conflicts: z.array(z.string()),
  judge_summary: z.string(),
  /** Model suggestion; runners may override with computeGroundednessFinalPass for consistency. */
  final_pass: z.boolean(),
});

export type RestaurantSummaryGroundednessJudge = z.infer<
  typeof RestaurantSummaryGroundednessJudgeSchema
>;

/**
 * Product-quality threshold aligned with the plan (computed in code for consistent gating).
 */
export function computeGroundednessFinalPass(j: RestaurantSummaryGroundednessJudge): boolean {
  return (
    j.faithfulness_score >= 4 &&
    j.consensus_accuracy_score >= 4 &&
    j.dish_recommendation_score >= 4 &&
    j.misleading_overall === false &&
    j.overstates_consensus === false
  );
}
