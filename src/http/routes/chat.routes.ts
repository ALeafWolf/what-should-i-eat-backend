import { Router } from "express";
import { handleChat } from "../controllers/chat.controller.js";
import { validateChatRequest } from "../validators/chat.validator.js";

const router = Router();

router.post("/", validateChatRequest, handleChat);

export default router;
