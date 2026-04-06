import { z } from "zod";

export const SseStatusEventSchema = z.object({
  type: z.literal("status"),
  message: z.string(),
});

export const SsePartialEventSchema = z.object({
  type: z.literal("partial"),
  data: z.unknown(),
});

export const SseWarningEventSchema = z.object({
  type: z.literal("warning"),
  message: z.string(),
});

export const SseDoneEventSchema = z.object({
  type: z.literal("done"),
  data: z.unknown(),
});

export const SseErrorEventSchema = z.object({
  type: z.literal("error"),
  message: z.string(),
  code: z.string(),
});

export const SseStepStartEventSchema = z.object({
  type: z.literal("step_start"),
  stepId: z.string(),
  label: z.string(),
});

export const SseStepDoneEventSchema = z.object({
  type: z.literal("step_done"),
  stepId: z.string(),
});

export const SseStepErrorEventSchema = z.object({
  type: z.literal("step_error"),
  stepId: z.string(),
  message: z.string(),
});

export const SseSourceSchema = z.object({
  title: z.string(),
  url: z.string(),
});

export const SseChatMessageEventSchema = z.object({
  type: z.literal("chat_message"),
  message: z.string(),
  intent: z.enum(["RESTAURANT_SEARCH", "RECIPE_SEARCH", "FOOD_QUESTION", "OTHER"]).optional(),
  sources: z.array(SseSourceSchema).optional(),
  sessionId: z.string(),
});

export const SseEventSchema = z.discriminatedUnion("type", [
  SseStatusEventSchema,
  SsePartialEventSchema,
  SseWarningEventSchema,
  SseDoneEventSchema,
  SseErrorEventSchema,
  SseStepStartEventSchema,
  SseStepDoneEventSchema,
  SseStepErrorEventSchema,
  SseChatMessageEventSchema,
]);

export type SseEvent = z.infer<typeof SseEventSchema>;
export type SseStatusEvent = z.infer<typeof SseStatusEventSchema>;
export type SsePartialEvent = z.infer<typeof SsePartialEventSchema>;
export type SseWarningEvent = z.infer<typeof SseWarningEventSchema>;
export type SseDoneEvent = z.infer<typeof SseDoneEventSchema>;
export type SseErrorEvent = z.infer<typeof SseErrorEventSchema>;
export type SseStepStartEvent = z.infer<typeof SseStepStartEventSchema>;
export type SseStepDoneEvent = z.infer<typeof SseStepDoneEventSchema>;
export type SseStepErrorEvent = z.infer<typeof SseStepErrorEventSchema>;
export type SseChatMessageEvent = z.infer<typeof SseChatMessageEventSchema>;
export type SseSource = z.infer<typeof SseSourceSchema>;
