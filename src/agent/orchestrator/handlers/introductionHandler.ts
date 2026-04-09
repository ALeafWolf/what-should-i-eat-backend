import { z } from "zod";
import { traceable } from "langsmith/traceable";
import { simpleTaskModel } from "../../models/index.js";

const IntroductionSchema = z.object({
  message: z
    .string()
    .describe(
      "A short, friendly paragraph explaining what the assistant can help with. No bullets labelled with internal steps; conversational tone only.",
    ),
});

async function _generateIntroduction(language: string, userMessage: string): Promise<string> {
  const structured = simpleTaskModel.withStructuredOutput(IntroductionSchema);
  const result = await structured.invoke([
    {
      role: "system",
      content: `You are helping users understand a food-focused chat assistant.

Write a brief introduction (3–5 short sentences max) explaining what users can do here, in a warm, helpful tone.

Capabilities to mention (in plain language only — do NOT describe pipelines, tools, APIs, models, agents, or workflows):
1. Find restaurant ideas: they can describe an area, cuisine, budget per person, and preferences (e.g. quiet, vegetarian).
2. Ask food-related questions: nutrition, ingredients, techniques, comparisons, food history, and similar topics.
3. Recipes: mention that recipe search is coming soon if you include it.

Respond entirely in the language matching the BCP 47 code: "${language}". If the code is unclear, match the user's message language.`,
    },
    { role: "user", content: userMessage },
  ]);
  return result.message;
}

export const generateIntroduction = traceable(_generateIntroduction, {
  name: "generateIntroduction",
  run_type: "chain",
});
