/**
 * Upload seed examples to a LangSmith dataset.
 *
 * Env: LANGSMITH_API_KEY, LANGSMITH_PROJECT (optional), EVAL_DATASET_NAME (optional)
 *
 * Usage: npx tsx src/evals/scripts/create-dataset.ts [datasetName]
 */
import "dotenv/config";
import { Client } from "langsmith";
import { SEED_EXAMPLES } from "../datasets/seed/seed-examples.js";
import { EvalSeedRowSchema } from "../schemas/dataset.schemas.js";

const DEFAULT_DATASET_NAME = "restaurant_summary_groundedness_seed";

async function main() {
  const datasetName = process.argv[2] ?? process.env["EVAL_DATASET_NAME"] ?? DEFAULT_DATASET_NAME;
  const client = new Client();

  const datasetExists = await client.hasDataset({ datasetName });

  if (datasetExists) {
    // Only check for existing examples when we know the dataset exists —
    // listExamples() calls readDataset() internally and throws if missing.
    let hasAny = false;
    for await (const _ of client.listExamples({ datasetName, limit: 1 })) {
      hasAny = true;
      break;
    }
    if (hasAny) {
      console.error(
        `Dataset "${datasetName}" already has examples. Skip upload to avoid duplicates. ` +
          `Delete examples in LangSmith or use a new EVAL_DATASET_NAME.`,
      );
      process.exit(0);
    }
  }

  let dataset;
  if (datasetExists) {
    dataset = await client.readDataset({ datasetName });
  } else {
    dataset = await client.createDataset(datasetName, {
      description:
        "Seed examples for restaurant review summary groundedness (restaurant_summary_groundedness_v1).",
    });
  }

  const uploads = SEED_EXAMPLES.map((row, i) => {
    const parsed = EvalSeedRowSchema.parse(row);
    return {
      dataset_id: dataset.id,
      inputs: parsed.inputs,
      outputs: parsed.referenceOutput,
      metadata: {
        ...parsed.metadata,
        seed_index: i,
        seed_version: 1,
      },
    };
  });

  await client.createExamples(uploads);
  const url = await client.getDatasetUrl({ datasetId: dataset.id });
  console.log(`Created ${uploads.length} examples in dataset "${datasetName}".`);
  console.log(`Dataset URL: ${url}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
