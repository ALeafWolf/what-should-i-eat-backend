import { Router } from "express";
import { searchRecipes } from "../controllers/recipe.controller.js";
import { validateRecipeSearchRequest } from "../validators/recipe.validator.js";

const router = Router();

router.post("/", validateRecipeSearchRequest, searchRecipes);

export default router;
