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

export const SseEventSchema = z.discriminatedUnion("type", [
  SseStatusEventSchema,
  SsePartialEventSchema,
  SseWarningEventSchema,
  SseDoneEventSchema,
  SseErrorEventSchema,
]);

export type SseEvent = z.infer<typeof SseEventSchema>;
export type SseStatusEvent = z.infer<typeof SseStatusEventSchema>;
export type SsePartialEvent = z.infer<typeof SsePartialEventSchema>;
export type SseWarningEvent = z.infer<typeof SseWarningEventSchema>;
export type SseDoneEvent = z.infer<typeof SseDoneEventSchema>;
export type SseErrorEvent = z.infer<typeof SseErrorEventSchema>;
