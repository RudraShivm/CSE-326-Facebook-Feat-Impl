import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import { getUserPosts } from "../controllers/post.controller";
import {
  getUser,
  updateUser,
  savePostHandler,
  unsavePostHandler,
  getSavedPosts,
  blockUserHandler,
  unblockUserHandler,
  getBlockedUsers,
} from "../controllers/user.controller";

const router = Router();

// Profile
router.get("/:userId", authenticate, getUser);
router.put("/:userId", authenticate, updateUser);

// User posts
router.get("/:userId/posts", authenticate, getUserPosts);

// Saved posts
router.post("/:userId/saved-posts/:postId", authenticate, savePostHandler);
router.delete("/:userId/saved-posts/:postId", authenticate, unsavePostHandler);
router.get("/:userId/saved-posts", authenticate, getSavedPosts);

// Block / Unblock
router.post("/:userId/block", authenticate, blockUserHandler);
router.delete("/:userId/block/:blockedId", authenticate, unblockUserHandler);
router.get("/:userId/blocked", authenticate, getBlockedUsers);

export default router;
