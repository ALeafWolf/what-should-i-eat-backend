import { z } from "zod";
import { basicModel } from "../../models/index.js";
import { searchFoodQuestion } from "../../../services/clients/webSearch.js";
import { MAX_FOOD_ANSWER_TOKENS } from "../../../shared/constants/index.js";

const FoodAnswerSchema = z.object({
  answer: z
    .string()
    .describe("Concise answer based on the search results, including key points from sources"),
  sources: z
    .array(
      z.object({
        title: z.string(),
        url: z.string(),
      }),
    )
    .describe("Sources referenced in the answer"),
});

export type FoodAnswer = z.infer<typeof FoodAnswerSchema>;

export async function answerFoodQuestion(
  question: string,
  language: string,
): Promise<FoodAnswer> {
  const searchResults = await searchFoodQuestion(question, language);

  if (searchResults.length === 0) {
    return {
      answer:
        language === "zh"
          ? "抱歉，我无法找到相关信息来回答这个问题。"
          : "Sorry, I couldn't find relevant information to answer this question.",
      sources: [],
    };
  }

  const sourcesText = searchResults
    .map((r, i) => `[${i + 1}] ${r.title}\nURL: ${r.url}\n${r.content}`)
    .join("\n\n");

  const structured = basicModel.withStructuredOutput(FoodAnswerSchema);
  return structured.invoke(
    [
      {
        role: "system",
        content: `You are a food knowledge assistant. Answer the user's food question based on the search results below.
Keep your answer concise (under ${MAX_FOOD_ANSWER_TOKENS} tokens). Reference sources by their [number].
Always respond in the same language as the user's question.
Do not ask follow-up questions.

Search results:
${sourcesText}`,
      },
      { role: "user", content: question },
    ],
  );
}
