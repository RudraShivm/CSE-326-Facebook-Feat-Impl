import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import { getFeed } from "../controllers/feed.controller";

const router = Router();

// GET /api/v1/feed
router.get("/", authenticate, getFeed);

export default router;
