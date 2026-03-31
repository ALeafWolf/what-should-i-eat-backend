import { Router } from "express";
import healthRoutes from "./health.routes.js";
import restaurantRoutes from "./restaurant.routes.js";
import recipeRoutes from "./recipe.routes.js";
import chatRoutes from "./chat.routes.js";

const router = Router();

router.use("/health", healthRoutes);
router.use("/restaurants", restaurantRoutes);
router.use("/recipes", recipeRoutes);
router.use("/chat", chatRoutes);

export default router;
