import type { Request, Response, NextFunction } from "express";
import type { ChatRequest } from "../../shared/types/index.js";
import { initSseResponse, createSseEmitter, closeSseResponse } from "../middleware/sseHelpers.js";
import {
  getSession,
  setSession,
  createSession,
} from "../../services/sessions/sessionStore.js";
import { runChatOrchestration } from "../../agent/orchestrator/chatOrchestrator.js";

export async function handleChat(
  req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> {
  initSseResponse(res);
  const emit = createSseEmitter(res);

  const ac = new AbortController();
  res.on("close", () => {
    if (!res.writableFinished) {
      ac.abort();
    }
  });

  try {
    const body = req.body as ChatRequest;
    const sessionId = body.sessionId ?? crypto.randomUUID();
    const session = getSession(sessionId) ?? createSession(sessionId);

    const updatedSession = await runChatOrchestration(
      body.message,
      session,
      emit,
      ac.signal,
    );

    setSession(updatedSession);
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      // Client disconnected — nothing to send
    } else {
      emit({ type: "error", message: String(err), code: "INTERNAL_ERROR" });
    }
  } finally {
    closeSseResponse(res);
  }
}
