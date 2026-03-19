import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import * as postService from "../services/post.service";
import { AppError } from "../middleware/error.middleware";

// ── Validation Schemas ────────────────────────────────────
const createPostSchema = z.object({
  content: z.string().max(5000, "Post content is too long").optional().default(""),
  imageUrl: z.string().url().optional(),
  videoUrl: z.string().url().optional(),
  visibility: z.enum(["PUBLIC", "FRIENDS", "PRIVATE"]).optional(),
  sharedPostId: z.string().uuid().optional(),
}).refine(
  (data) => (data.content && data.content.trim().length > 0) || data.imageUrl || data.videoUrl || data.sharedPostId,
  { message: "Post must have content, media, or a shared post.", path: ["content"] }
);

const updatePostSchema = z.object({
  content: z.string().min(1).max(5000).optional(),
  imageUrl: z.string().url().optional(),
  videoUrl: z.string().url().optional(),
  visibility: z.enum(["PUBLIC", "FRIENDS", "PRIVATE"]).optional(),
});

// ── Create Post ───────────────────────────────────────────
export async function createPost(req: Request, res: Response, next: NextFunction) {
  try {
    const validated = createPostSchema.parse(req.body);
    const post = await postService.createPost(req.user!.userId, validated);
    res.status(201).json(post);
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(new AppError(error.errors[0].message, 400, "VALIDATION_ERROR"));
    } else {
      next(error);
    }
  }
}

// ── Get Post ──────────────────────────────────────────────
export async function getPost(req: Request, res: Response, next: NextFunction) {
  try {
    const post = await postService.getPostById(req.params.postId as string, req.user!.userId);
    res.json(post);
  } catch (error) {
    next(error);
  }
}

// ── Update Post ───────────────────────────────────────────
export async function updatePost(req: Request, res: Response, next: NextFunction) {
  try {
    const validated = updatePostSchema.parse(req.body);
    const post = await postService.updatePost(
      req.params.postId as string,
      req.user!.userId,
      validated
    );
    res.json(post);
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(new AppError(error.errors[0].message, 400, "VALIDATION_ERROR"));
    } else {
      next(error);
    }
  }
}

// ── Delete Post ───────────────────────────────────────────
export async function deletePost(req: Request, res: Response, next: NextFunction) {
  try {
    await postService.deletePost(req.params.postId as string, req.user!.userId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

// ── Get User's Posts ──────────────────────────────────────
export async function getUserPosts(req: Request, res: Response, next: NextFunction) {
  try {
    const cursor = req.query.cursor as string | undefined;
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);
    const result = await postService.getUserPosts(
      req.params.userId as string,
      req.user!.userId,
      cursor,
      limit
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
}
