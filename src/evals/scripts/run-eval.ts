/**
 * Run LangSmith evaluate() on a dataset or local seed examples.
 *
 * Env: OPENAI_API_KEY, BASIC_MODEL, LANGSMITH_API_KEY, LANGSMITH_TRACING=true (recommended)
 *
 * Usage:
 *   npx tsx src/evals/scripts/run-eval.ts [datasetName]
 *   npx tsx src/evals/scripts/run-eval.ts --local
 */
import "dotenv/config";
import { evaluate } from "langsmith/evaluation";
import type { EvaluationResult } from "langsmith/evaluation";
import { Client } from "langsmith";
import type { Example } from "langsmith/schemas";
import { summarizeReviews } from "../../agent/workflows/restaurant-workflow/summarizeReviews.js";
import { restaurantSummaryGroundednessEvaluator } from "../evaluators/groundedness.js";
import { SEED_EXAMPLES } from "../datasets/seed/seed-examples.js";
import { EvalSeedRowSchema } from "../schemas/dataset.schemas.js";
import type { ReviewSnippet } from "../../shared/types/index.js";
import { randomUUID } from "node:crypto";

const DEFAULT_DATASET_NAME = "restaurant_summary_groundedness_seed";
const PREFIX = "restaurant_summary_groundedness_v1";

function toReviewSnippets(raw: unknown): ReviewSnippet[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((s) => {
    const o = s as Record<string, unknown>;
    return {
      text: String(o["text"] ?? ""),
      source: String(o["source"] ?? "google_places"),
      rating: typeof o["rating"] === "number" ? o["rating"] : undefined,
      author: o["author"] != null ? String(o["author"]) : undefined,
      date: o["date"] != null ? String(o["date"]) : undefined,
    };
  });
}

function buildInlineExamplesFromSeed(): Example[] {
  const datasetId = "00000000-0000-4000-8000-000000000001";
  const now = new Date().toISOString();
  return SEED_EXAMPLES.map((row, i) => {
    const parsed = EvalSeedRowSchema.parse(row);
    return {
      id: randomUUID(),
      dataset_id: datasetId,
      created_at: now,
      modified_at: now,
      inputs: parsed.inputs as Record<string, unknown>,
      outputs: parsed.referenceOutput as Record<string, unknown> | undefined,
      metadata: { ...parsed.metadata, seed_index: i, seed_version: 1 },
      runs: [],
    };
  });
}

async function targetFn(input: Record<string, unknown>) {
  const name = String(input["restaurantName"] ?? "");
  const snippets = toReviewSnippets(input["snippets"]);
  const language = input["language"] != null ? String(input["language"]) : undefined;
  const invoke = summarizeReviews as unknown as (
    restaurantName: string,
    snippets: ReviewSnippet[],
    language?: string,
  ) => Promise<Awaited<ReturnType<typeof summarizeReviews>>>;
  return invoke(name, snippets, language);
}

function scoreFromResults(results: EvaluationResult[], keySuffix: string): number | undefined {
  const k = `${PREFIX}/${keySuffix}`;
  const hit = results.find((r) => r.key === k);
  const s = hit?.score;
  if (s === null || s === undefined) return undefined;
  return typeof s === "number" ? s : undefined;
}

function valueFromResults(results: EvaluationResult[], keySuffix: string): string | undefined {
  const k = `${PREFIX}/${keySuffix}`;
  const hit = results.find((r) => r.key === k);
  if (hit?.value == null) return undefined;
  return typeof hit.value === "string" ? hit.value : JSON.stringify(hit.value);
}

async function main() {
  const argv = process.argv.slice(2).filter((a) => !a.endsWith(".ts"));
  const useLocal = argv.includes("--local");
  const positional = argv.filter((a) => !a.startsWith("-"));
  const resolvedName = positional[0] ?? process.env["EVAL_DATASET_NAME"];

  const data = useLocal
    ? buildInlineExamplesFromSeed()
    : (resolvedName ?? DEFAULT_DATASET_NAME);

  if (!useLocal && typeof data === "string") {
    const client = new Client();
    const has = await client.hasDataset({ datasetName: data });
    if (!has) {
      console.error(
        `Dataset "${data}" not found in LangSmith. Run npm run eval:create-dataset first, or use --local.`,
      );
      process.exit(1);
    }
  }

  const experimentPrefix = process.env["EVAL_EXPERIMENT_PREFIX"] ?? "summary-groundedness";
  const evaluators = [restaurantSummaryGroundednessEvaluator];

  console.log(
    useLocal
      ? `Running evaluate() on ${(data as Example[]).length} inline seed examples...`
      : `Running evaluate() on dataset "${data}"...`,
  );

  const experimentResults = await evaluate(targetFn, {
    data: data as string | Example[],
    evaluators,
    experimentPrefix,
    maxConcurrency: 2,
    metadata: {
      evaluator: "restaurant_summary_groundedness_v1",
      data_source: useLocal ? "inline_seed" : "langsmith_dataset",
    },
  });

  let passCount = 0;
  let faithSum = 0;
  let consensusSum = 0;
  let dishSum = 0;
  let count = 0;

  for (const row of experimentResults.results) {
    const er = row.evaluationResults?.results ?? [];
    const fp = scoreFromResults(er, "final_pass");
    if (fp === 1) passCount++;
    const f = scoreFromResults(er, "faithfulness");
    const c = scoreFromResults(er, "consensus_accuracy");
    const d = scoreFromResults(er, "dish_recommendation");
    if (f != null) faithSum += f;
    if (c != null) consensusSum += c;
    if (d != null) dishSum += d;
    count++;

    const name = String(row.example.inputs["restaurantName"] ?? "?");
    const misleading = scoreFromResults(er, "misleading_overall");
    const unsupportedJson = valueFromResults(er, "unsupported_claims_json");

    console.log("\n---", name, "---");
    console.log(
      "MVP metrics:",
      JSON.stringify(
        {
          faithfulness_0_1: f,
          consensus_accuracy_0_1: c,
          dish_recommendation_0_1: d,
          not_misleading_0_1: misleading,
          final_pass: fp,
          unsupported_claims: unsupportedJson ? JSON.parse(unsupportedJson) : [],
        },
        null,
        2,
      ),
    );
  }

  const n = count || 1;
  console.log("\n========== Summary ==========");
  console.log(`Experiment: ${experimentResults.experimentName}`);
  console.log(`Examples: ${count}`);
  console.log(`Pass rate (final_pass): ${(passCount / n).toFixed(3)}`);
  console.log(`Mean faithfulness (0-1): ${(faithSum / n).toFixed(3)}`);
  console.log(`Mean consensus_accuracy (0-1): ${(consensusSum / n).toFixed(3)}`);
  console.log(`Mean dish_recommendation (0-1): ${(dishSum / n).toFixed(3)}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
