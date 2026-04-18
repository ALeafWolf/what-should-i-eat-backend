## How to run dataset experiment
### Step 1: Upload seed dataset to LangSmith (once)
npm run eval:create-dataset

### Step 2: Run an experiment
npm run eval:run

### Step 3: View in LangSmith UI
home → Datasets → restaurant_summary_groundedness_seed → Experiments tab
home → Compare experiments across model/prompt versions side by side

### Switching the summarizer model being evaluated

`summarizeReviews` (the function being evaluated) uses `basicModel`, which reads the `BASIC_MODEL` env var at startup. To test a different model, change `BASIC_MODEL` in `.env` before running the experiment — each run creates a new named experiment in LangSmith so results are never overwritten.

**Example workflow — comparing two models:**

```bash
# Experiment A: cheap model
BASIC_MODEL=gpt-4o-mini npm run eval:run

# Experiment B: better model
BASIC_MODEL=gpt-4o npm run eval:run
```

Both experiments will appear side-by-side in LangSmith under the same dataset. Use the **Compare** button on the Experiments tab to see which model scores higher on faithfulness, consensus_accuracy, and final_pass.

**Tip — use `EVAL_EXPERIMENT_PREFIX` to label runs clearly:**

```bash
BASIC_MODEL=gpt-4o-mini EVAL_EXPERIMENT_PREFIX=mini npm run eval:run
BASIC_MODEL=gpt-4o      EVAL_EXPERIMENT_PREFIX=4o   npm run eval:run
```

This names the experiments `mini-<hash>` and `4o-<hash>` instead of the default `summary-groundedness-<hash>`, making the compare view easier to read.

**Note:** `BASIC_MODEL` also controls the **judge** (the evaluator itself), since both the summarizer and the judge use `basicModel`. If you want the judge to always use a strong model regardless of what you are testing, extract the judge to `advancedModel` (the `ADVANCED_MODEL` env var) in `src/evals/evaluators/groundedness.ts`.

---

## Evaluator field reference (restaurant_summary_groundedness_v1)

All columns in the LangSmith experiment table are prefixed with `restaurant_summary_groundedness_v1/`.

### Numeric scores (0.0 – 1.0 in LangSmith, internally rated 1–5 by judge ÷ 5)

| Column suffix | What the judge is asking | Bad score means… |
|---|---|---|
| `faithfulness` | Are every claim in `reviewSummary`, `positives`, and `complaints` supported by the provided review snippets? | Summarizer invented or exaggerated facts not in any review |
| `consensus_accuracy` | Is the strength of evidence represented correctly — majority opinion vs mixed vs one reviewer? | Summarizer said "everyone loves X" when only 1–2 reviews mention it |
| `balance` | When reviews are mixed, does the output fairly reflect both sides? | Summarizer only highlighted positives and buried negatives (or vice versa) |
| `coverage` | Are the most decision-useful themes from the reviews captured? | An important recurring topic (e.g. long waits) was completely omitted |
| `positives_complaints_classification` | Are items placed in the right list — `positives` vs `complaints`? | A negative aspect ended up in `positives`, or a positive ended up in `complaints` |
| `dish_recommendation` | Is every item in `recommendedDishes` actually mentioned in a review? | Summarizer invented dish names not referenced by any reviewer |

### Binary flags (1.0 = good / no problem, 0.0 = problem detected)

| Column suffix | Meaning | 0.0 (problem) means… |
|---|---|---|
| `misleading_overall` | Would a user form a materially wrong impression of the restaurant from this summary? | Yes — the output as a whole is misleading |
| `overstates_consensus` | Did the summarizer present weak or split evidence as broad agreement? | Yes — e.g. "customers rave about…" based on 1 review |

### Gate field

| Column suffix | Meaning |
|---|---|
| `final_pass` | **1.0 = passed quality gate, 0.0 = failed.** Requires: `faithfulness ≥ 0.8` AND `consensus_accuracy ≥ 0.8` AND `dish_recommendation ≥ 0.8` AND `misleading_overall = 1.0` AND `overstates_consensus = 1.0` |

### Text fields (visible when clicking into a single row, not in the summary table)

| Column suffix | Content |
|---|---|
| `judge_summary` | Free-text explanation from the judge — the most useful field for understanding *why* a row scored low |
| `unsupported_claims_json` | JSON array of specific claims the judge could not ground in the reviews |
| `missed_major_points_json` | JSON array of themes present in the reviews that the summary failed to mention |
| `evidence_conflicts_json` | JSON array of places where the summary contradicts what the reviews actually say |

### Reading the table quickly

- **Green rows (high scores)**: summarizer is faithful and well-calibrated for that scenario.
- **Low `consensus_accuracy`**: most common failure — overconfident language ("everyone loves…") on mixed evidence.
- **Low `dish_recommendation`**: summarizer hallucinated a dish name.
- **`final_pass = 0.0`**: the row failed the product-quality gate; check `judge_summary` to understand why.
- **AVG row at the top**: the column average across all 9 seed examples — the primary number to track across experiments.

