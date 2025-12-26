import { Router, IRouter } from "express";
import { signup, signin, getMe } from "../controllers/auth.controller.js";
import { authLimiter } from "../middleware/rateLimiter.js";
import { middleware } from "../middleware/auth.js";

const router: IRouter = Router();

// Public routes with rate limiting
router.post("/signup", authLimiter, signup);
router.post("/signin", authLimiter, signin);

// Protected routes
router.get("/me", middleware, getMe);

export default router;
