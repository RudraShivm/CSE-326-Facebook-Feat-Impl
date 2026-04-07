import { Router } from "express";
import { register, login, logout, refresh, me, accounts, switchAccount } from "../controllers/auth.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = Router();

// Public routes (no auth required)
router.post("/register", register);
router.post("/login", login);
router.post("/refresh", refresh);
router.get("/accounts", accounts);
router.post("/switch-account", switchAccount);

// Protected routes (auth required)
router.get("/me", authenticate, me);
router.post("/logout", authenticate, logout);

export default router;
