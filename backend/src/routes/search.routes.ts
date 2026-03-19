import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import { search } from "../controllers/search.controller";

const router = Router();

router.get("/", authenticate, search);

export default router;
