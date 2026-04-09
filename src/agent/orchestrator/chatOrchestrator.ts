import { traceable } from "langsmith/traceable";
import type { WorkflowEmitter, SessionData } from "../../shared/types/index.js";
import { classifyIntent } from "./intentClassifier.js";
import { answerFoodQuestion } from "./handlers/foodQuestionHandler.js";
import { generateIntroduction } from "./handlers/introductionHandler.js";
import { runRestaurantWorkflow } from "../workflows/restaurant-workflow/index.js";
import { MAX_CONVERSATION_TURNS } from "../../shared/constants/index.js";
import type { SseEvent } from "../schemas/sse.schemas.js";
import type { RestaurantResponse } from "../../shared/types/index.js";

function appendTurn(
  session: SessionData,
  role: "user" | "assistant",
  content: string,
): void {
  session.conversationHistory.push({ role, content, timestamp: Date.now() });
  if (session.conversationHistory.length > MAX_CONVERSATION_TURNS) {
    session.conversationHistory = session.conversationHistory.slice(-MAX_CONVERSATION_TURNS);
  }
}

function makeWrappedEmit(emit: WorkflowEmitter): WorkflowEmitter {
  return (event: SseEvent) => {
    if (event.type === "done") {
      const data = event.data as RestaurantResponse | undefined;
      if (data?.restaurants) {
        emit({ type: "done", data: { ...data, restaurants: data.restaurants.slice(0, 3) } });
        return;
      }
    }
    emit(event);
  };
}

async function _executeRestaurantSearch(
  params: {
    area: string;
    areaEn?: string;
    cuisine: string;
    cuisineEn?: string;
    budget?: number;
    currency?: string;
    preferences?: string[];
    language?: string;
    sessionId: string;
  },
  session: SessionData,
  emit: WorkflowEmitter,
  signal?: AbortSignal,
): Promise<string> {
  let restaurantResponse: RestaurantResponse | undefined;
  try {
    restaurantResponse = await runRestaurantWorkflow(params, makeWrappedEmit(emit), signal);
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") throw err;
    return "";
  }

  if (restaurantResponse) {
    session.lastRestaurantQuery = {
      area: params.area,
      cuisine: params.cuisine,
      budget: params.budget,
      preferences: params.preferences ?? [],
      language: params.language,
      currency: params.currency,
    };
    session.lastRestaurantResultSummary = restaurantResponse.restaurants
      .slice(0, 3)
      .map((r) => ({ name: r.name, id: r.id, score: 0 }));
    return restaurantResponse.finalRecommendation;
  }
  return "";
}

const executeRestaurantSearch = traceable(_executeRestaurantSearch, {
  name: "executeRestaurantSearch",
  run_type: "chain",
});

async function _runChatOrchestration(
  message: string,
  session: SessionData,
  emit: WorkflowEmitter,
  signal?: AbortSignal,
): Promise<SessionData> {
  const intent = await classifyIntent(message, session);
  appendTurn(session, "user", message);

  let assistantResponse = "";

  // If the user was previously asked for optional details, run the search now
  // regardless of current intent — "If user does not provide more, proceed anyway"
  if (session.pendingRestaurantQuery) {
    const pending = session.pendingRestaurantQuery;
    session.pendingRestaurantQuery = undefined;

    const newFields = intent.intent === "RESTAURANT_SEARCH" ? intent.restaurantFields : null;
    const budget = (newFields?.pricePerPerson ?? 0) > 0 ? (newFields?.pricePerPerson ?? undefined) : undefined;
    const currency = budget != null ? (newFields?.currency ?? undefined) : undefined;
    const preferences = (newFields?.preferences?.length ?? 0) > 0 ? (newFields?.preferences ?? undefined) : undefined;

    assistantResponse = await executeRestaurantSearch(
      {
        area: pending.area,
        areaEn: pending.areaEn,
        cuisine: pending.cuisine,
        cuisineEn: pending.cuisineEn,
        budget,
        currency,
        preferences,
        language: pending.language ?? intent.language,
        sessionId: session.id,
      },
      session,
      emit,
      signal,
    );

    if (assistantResponse) appendTurn(session, "assistant", assistantResponse);
    return session;
  }

  switch (intent.intent) {
    case "RESTAURANT_SEARCH": {
      const fields = intent.restaurantFields;
      const location = fields?.location ?? session.lastRestaurantQuery?.area;
      const cuisine = fields?.cuisine ?? session.lastRestaurantQuery?.cuisine;

      if (!location || !cuisine) {
        const missing: string[] = [];
        if (!location) missing.push(intent.language === "zh" ? "地点" : "location");
        if (!cuisine) missing.push(intent.language === "zh" ? "菜系" : "cuisine type");
        const missingStr = missing.join(intent.language === "zh" ? "和" : " and ");

        assistantResponse =
          intent.language === "zh"
            ? `请提供${missingStr}以便我为您搜索餐厅。`
            : `Please provide the ${missingStr} so I can search for restaurants.`;

        emit({ type: "chat_message", message: assistantResponse, intent: intent.intent, sessionId: session.id });
        break;
      }

      const hasBudget = (fields?.pricePerPerson ?? 0) > 0;
      const hasPreferences = (fields?.preferences?.length ?? 0) > 0;
      const userProvidedOptionals = hasBudget || hasPreferences;

      // Ask for optional details before searching if the user didn't provide any
      if (!userProvidedOptionals) {
        session.pendingRestaurantQuery = {
          area: location,
          areaEn: fields?.locationEn ?? undefined,
          cuisine,
          cuisineEn: fields?.cuisineEn ?? undefined,
          language: intent.language,
        };

        assistantResponse =
          intent.language === "zh"
            ? `好的！在为您搜索${location}的${cuisine}餐厅之前，请问您还有其他要求吗？\n\n- 每人预算（例如：100元）\n- 特殊偏好（例如：安静、户外座位、素食）\n\n如果没有特别要求，直接发送任意内容即可开始搜索。`
            : `Got it! Before searching for ${cuisine} restaurants in ${location}, would you like to add any details?\n\n- Budget per person (e.g. $50)\n- Preferences (e.g. quiet, outdoor seating, vegetarian)\n\nOr just send any message to search right away.`;

        emit({ type: "chat_message", message: assistantResponse, intent: intent.intent, sessionId: session.id });
        break;
      }

      // Optional fields were provided — run the search immediately
      const budget = hasBudget ? (fields?.pricePerPerson ?? undefined) : undefined;
      const currency = hasBudget ? (fields?.currency ?? undefined) : undefined;
      const preferences = hasPreferences ? (fields?.preferences ?? undefined) : undefined;

      assistantResponse = await executeRestaurantSearch(
        {
          area: location,
          areaEn: fields?.locationEn ?? undefined,
          cuisine,
          cuisineEn: fields?.cuisineEn ?? undefined,
          budget,
          currency,
          preferences,
          language: intent.language,
          sessionId: session.id,
        },
        session,
        emit,
        signal,
      );
      break;
    }

    case "RECIPE_SEARCH": {
      assistantResponse =
        intent.language === "zh"
          ? "食谱搜索功能即将上线，敬请期待！"
          : "Recipe finding feature is coming soon. Stay tuned!";

      emit({ type: "chat_message", message: assistantResponse, intent: intent.intent, sessionId: session.id });
      break;
    }

    case "FOOD_QUESTION": {
      const question = intent.foodQuestion ?? message;
      try {
        const answer = await answerFoodQuestion(question, intent.language);
        assistantResponse = answer.answer;
        emit({ type: "chat_message", message: answer.answer, intent: intent.intent, sources: answer.sources, sessionId: session.id });
      } catch {
        assistantResponse =
          intent.language === "zh"
            ? "抱歉，我无法回答这个问题，请稍后再试。"
            : "Sorry, I couldn't answer that question. Please try again later.";
        emit({ type: "chat_message", message: assistantResponse, intent: intent.intent, sessionId: session.id });
      }
      break;
    }

    case "FUNCTION_INTRODUCTION": {
      try {
        assistantResponse = await generateIntroduction(intent.language, message);
        emit({
          type: "chat_message",
          message: assistantResponse,
          intent: intent.intent,
          sessionId: session.id,
        });
      } catch {
        assistantResponse =
          intent.language === "zh"
            ? "我可以帮您按地区和菜系搜索餐厅、回答食物相关问题；食谱功能即将推出。"
            : "I can help you find restaurants by area and cuisine, answer food questions, and recipe search is coming soon.";
        emit({ type: "chat_message", message: assistantResponse, intent: intent.intent, sessionId: session.id });
      }
      break;
    }

    case "OTHER":
    default: {
      assistantResponse =
        intent.language === "zh"
          ? "很抱歉，我只能帮助您搜索餐厅或回答食物相关问题。"
          : "I'm sorry, I can only help with restaurant searches and food-related questions.";

      emit({ type: "chat_message", message: assistantResponse, intent: intent.intent, sessionId: session.id });
      break;
    }
  }

  if (assistantResponse) {
    appendTurn(session, "assistant", assistantResponse);
  }

  return session;
}

export const runChatOrchestration = traceable(_runChatOrchestration, {
  name: "runChatOrchestration",
  run_type: "chain",
});
