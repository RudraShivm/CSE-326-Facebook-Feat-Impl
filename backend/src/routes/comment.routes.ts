import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import * as commentCtrl from "../controllers/comment.controller";

// mergeParams: true lets us access :postId from the parent router
const router = Router({ mergeParams: true });

router.get("/", authenticate, commentCtrl.getComments);
router.post("/", authenticate, commentCtrl.addComment);
router.patch("/:commentId", authenticate, commentCtrl.editComment);
router.delete("/:commentId", authenticate, commentCtrl.removeComment);

export default router;
