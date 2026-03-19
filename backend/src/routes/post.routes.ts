import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import * as postCtrl from "../controllers/post.controller";

const router = Router();

// All post routes require authentication
router.use(authenticate);

router.post("/", postCtrl.createPost);
router.get("/:postId", postCtrl.getPost);
router.patch("/:postId", postCtrl.updatePost);
router.delete("/:postId", postCtrl.deletePost);

export default router;
