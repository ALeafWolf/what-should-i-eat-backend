import rateLimit from "express-rate-limit";
import { MAX_CHAT_REQUESTS_PER_MINUTE } from "../../shared/constants/index.js";

export const chatRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: MAX_CHAT_REQUESTS_PER_MINUTE,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "TOO_MANY_REQUESTS",
    message: "Too many chat requests, please slow down and try again in a minute.",
  },
});
