import type { EvaluationResult } from "langsmith/evaluation";
import { basicModel } from "../../agent/models/index.js";
import type { ReviewSummary } from "../../shared/types/index.js";
import {
  type EvalExampleInputs,
  EvalExampleInputsSchema,
  EvalExampleMetadataSchema,
  EvalReferenceOutputSchema,
} from "../schemas/dataset.schemas.js";
import {
  RestaurantSummaryGroundednessJudgeSchema,
  computeGroundednessFinalPass,
} from "../schemas/evaluator-output.schemas.js";
import { RESTAURANT_SUMMARY_GROUNDEDNESS_V1_SYSTEM, buildJudgeUserContent } from "./prompt.js";

const EVAL_KEY_PREFIX = "restaurant_summary_groundedness_v1";

function parseInputs(raw: Record<string, unknown>): EvalExampleInputs {
  return EvalExampleInputsSchema.parse(raw);
}

function parseMetadata(raw: unknown) {
  if (!raw || typeof raw !== "object") return undefined;
  const parsed = EvalExampleMetadataSchema.safeParse(raw);
  return parsed.success ? parsed.data : undefined;
}

function parseOutputs(raw: Record<string, unknown> | undefined): ReviewSummary {
  if (!raw) {
    return {
      reviewSummary: "",
      positives: [],
      complaints: [],
      recommendedDishes: [],
    };
  }
  return {
    reviewSummary: String(raw["reviewSummary"] ?? ""),
    positives: Array.isArray(raw["positives"]) ? raw["positives"].map(String) : [],
    complaints: Array.isArray(raw["complaints"]) ? raw["complaints"].map(String) : [],
    recommendedDishes: Array.isArray(raw["recommendedDishes"])
      ? raw["recommendedDishes"].map(String)
      : [],
  };
}

function parseReferenceOutputs(raw: Record<string, unknown> | undefined): ReviewSummary | undefined {
  if (!raw) return undefined;
  const parsed = EvalReferenceOutputSchema.safeParse(raw);
  if (!parsed.success) return undefined;
  return parsed.data;
}

const structuredJudge = basicModel.withStructuredOutput(RestaurantSummaryGroundednessJudgeSchema);

/**
 * LLM-as-judge row evaluator for LangSmith `evaluate()`.
 * Pass this function in `evaluators`; the SDK wraps it with `runEvaluator` internally.
 */
export async function restaurantSummaryGroundednessEvaluator(args: {
  inputs: Record<string, unknown>;
  outputs?: Record<string, unknown>;
  referenceOutputs?: Record<string, unknown>;
  example?: { metadata?: Record<string, unknown> };
}): Promise<{ results: EvaluationResult[] }> {
  const { inputs, outputs, referenceOutputs, example } = args;
  const parsedInputs = parseInputs(inputs);
  const parsedOutputs = parseOutputs(outputs);
  const ref = parseReferenceOutputs(referenceOutputs);
  const metadata = parseMetadata(example?.metadata);

  const userContent = buildJudgeUserContent({
    inputs: parsedInputs,
    outputs: parsedOutputs,
    metadata,
    referenceOutputs: ref,
  });

  const judge = await structuredJudge.invoke([
    { role: "system", content: RESTAURANT_SUMMARY_GROUNDEDNESS_V1_SYSTEM },
    { role: "user", content: userContent },
  ]);

  const finalPass = computeGroundednessFinalPass(judge);

  return {
    results: [
      {
        key: `${EVAL_KEY_PREFIX}/faithfulness`,
        score: judge.faithfulness_score / 5,
      },
      {
        key: `${EVAL_KEY_PREFIX}/consensus_accuracy`,
        score: judge.consensus_accuracy_score / 5,
      },
      {
        key: `${EVAL_KEY_PREFIX}/balance`,
        score: judge.balance_score / 5,
      },
      {
        key: `${EVAL_KEY_PREFIX}/coverage`,
        score: judge.coverage_score / 5,
      },
      {
        key: `${EVAL_KEY_PREFIX}/positives_complaints_classification`,
        score: judge.positives_complaints_classification_score / 5,
      },
      {
        key: `${EVAL_KEY_PREFIX}/dish_recommendation`,
        score: judge.dish_recommendation_score / 5,
      },
      {
        key: `${EVAL_KEY_PREFIX}/misleading_overall`,
        score: judge.misleading_overall ? 0 : 1,
      },
      {
        key: `${EVAL_KEY_PREFIX}/overstates_consensus`,
        score: judge.overstates_consensus ? 0 : 1,
      },
      {
        key: `${EVAL_KEY_PREFIX}/final_pass`,
        score: finalPass ? 1 : 0,
      },
      {
        key: `${EVAL_KEY_PREFIX}/judge_summary`,
        value: judge.judge_summary,
      },
      {
        key: `${EVAL_KEY_PREFIX}/unsupported_claims_json`,
        value: JSON.stringify(judge.unsupported_claims),
      },
      {
        key: `${EVAL_KEY_PREFIX}/missed_major_points_json`,
        value: JSON.stringify(judge.missed_major_points),
      },
      {
        key: `${EVAL_KEY_PREFIX}/evidence_conflicts_json`,
        value: JSON.stringify(judge.evidence_conflicts),
      },
    ],
  };
}

/** @deprecated Prefer importing `restaurantSummaryGroundednessEvaluator` directly. */
export function createRestaurantSummaryGroundednessEvaluator() {
  return restaurantSummaryGroundednessEvaluator;
}
