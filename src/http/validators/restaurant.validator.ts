import type { Request, Response, NextFunction } from "express";
import { RestaurantSearchRequestSchema } from "../../agent/schemas/request.schemas.js";

export function validateRestaurantSearchRequest(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  try {
    req.body = RestaurantSearchRequestSchema.parse(req.body);
    next();
  } catch (err) {
    next(err);
  }
}
