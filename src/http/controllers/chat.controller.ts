import type { Request, Response, NextFunction } from "express";
import type { ChatRequest } from "../../shared/types/index.js";

export async function handleChat(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const body = req.body as ChatRequest;

    // TODO: Phase 4 - implement real session-based chat orchestration
    // - read session state from session store
    // - run lightweight intent detection (restaurant refinement, recipe refinement, topic switch, out-of-scope)
    // - merge refinement into prior session context
    // - run the appropriate workflow
    // - save updated session state

    const sessionId = body.sessionId ?? crypto.randomUUID();

    res.json({
      message: `Mock chat response for: "${body.message}". Full session-based orchestration available in Phase 4.`,
      sessionId,
    });
  } catch (err) {
    next(err);
  }
}
