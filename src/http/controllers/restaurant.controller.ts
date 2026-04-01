import type { Request, Response, NextFunction } from "express";
import type { RestaurantSearchRequest } from "../../shared/types/index.js";
import { runRestaurantWorkflow } from "../../agent/workflows/restaurant-workflow/index.js";
import { initSseResponse, createSseEmitter, closeSseResponse } from "../middleware/sseHelpers.js";

export async function searchRestaurants(
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
    const body = req.body as RestaurantSearchRequest;
    await runRestaurantWorkflow(body, emit, ac.signal);
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
