import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import * as reactionService from "../services/reaction.service";
import { AppError } from "../middleware/error.middleware";

const reactionSchema = z.object({
  type: z.enum(["LIKE", "LOVE", "HAHA", "WOW", "SAD", "ANGRY"]),
});

// ── Post Reactions ─────────────────────────────────────────
export async function reactToPost(req: Request, res: Response, next: NextFunction) {
  try {
    const { type } = reactionSchema.parse(req.body);
    const result = await reactionService.togglePostReaction(
      req.params.postId as string,
      req.user!.userId,
      type
    );
    res.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(new AppError(error.errors[0].message, 400, "VALIDATION_ERROR"));
    } else next(error);
  }
}

export async function getPostReactions(req: Request, res: Response, next: NextFunction) {
  try {
    const reactions = await reactionService.getPostReactions(req.params.postId as string);
    res.json(reactions);
  } catch (error) {
    next(error);
  }
}

// ── Comment Reactions ──────────────────────────────────────
export async function reactToComment(req: Request, res: Response, next: NextFunction) {
  try {
    const { type } = reactionSchema.parse(req.body);
    const result = await reactionService.toggleCommentReaction(
      req.params.commentId as string,
      req.user!.userId,
      type
    );
    res.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(new AppError(error.errors[0].message, 400, "VALIDATION_ERROR"));
    } else next(error);
  }
}
