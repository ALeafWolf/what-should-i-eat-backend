import { Router } from "express";
import { searchRestaurants } from "../controllers/restaurant.controller.js";
import { validateRestaurantSearchRequest } from "../validators/restaurant.validator.js";

const router = Router();

router.post("/", validateRestaurantSearchRequest, searchRestaurants);

export default router;
