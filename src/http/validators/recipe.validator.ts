import type { Request, Response, NextFunction } from "express";
import { RecipeSearchRequestSchema } from "../../agent/schemas/request.schemas.js";

export function validateRecipeSearchRequest(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  try {
    req.body = RecipeSearchRequestSchema.parse(req.body);
    next();
  } catch (err) {
    next(err);
  }
}
