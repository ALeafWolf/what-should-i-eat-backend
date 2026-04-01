import type { Response } from "express";
import type { WorkflowEmitter } from "../../shared/types/index.js";
import type { SseEvent } from "../../agent/schemas/sse.schemas.js";

export function initSseResponse(res: Response): void {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();
}

export function createSseEmitter(res: Response): WorkflowEmitter {
  return (event: SseEvent) => {
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  };
}

export function closeSseResponse(res: Response): void {
  res.end();
}
