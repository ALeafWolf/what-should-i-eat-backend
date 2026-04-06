import { Router } from "express";
import { handleChat } from "../controllers/chat.controller.js";
import { validateChatRequest } from "../validators/chat.validator.js";
import { chatRateLimiter } from "../middleware/rateLimiter.js";

const router = Router();

router.post("/", chatRateLimiter, validateChatRequest, handleChat);

export default router;
