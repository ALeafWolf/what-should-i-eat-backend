import type { Request, Response, NextFunction } from "express";
import { ChatRequestSchema } from "../../agent/schemas/request.schemas.js";

export function validateChatRequest(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  try {
    req.body = ChatRequestSchema.parse(req.body);
    next();
  } catch (err) {
    next(err);
  }
}
