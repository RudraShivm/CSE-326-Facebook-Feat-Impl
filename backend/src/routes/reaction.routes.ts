import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import * as reactionCtrl from "../controllers/reaction.controller";

const router = Router();

router.use(authenticate);

// /posts/:postId/reactions
router.post("/posts/:postId/reactions", reactionCtrl.reactToPost);
router.get("/posts/:postId/reactions", reactionCtrl.getPostReactions);

// /comments/:commentId/reactions
router.post("/comments/:commentId/reactions", reactionCtrl.reactToComment);

export default router;
