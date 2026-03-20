import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import * as commentService from "../services/comment.service";
import { AppError } from "../middleware/error.middleware";

const commentSchema = z.object({
  content: z.string().min(1, "Comment cannot be empty").max(2000),
});

export async function addComment(req: Request, res: Response, next: NextFunction) {
  try {
    const { content } = commentSchema.parse(req.body);
    const comment = await commentService.createComment(
      req.params.postId as string,
      req.user!.userId,
      content
    );
    res.status(201).json(comment);
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(new AppError(error.errors[0].message, 400, "VALIDATION_ERROR"));
    } else {
      next(error);
    }
  }
}

export async function getComments(req: Request, res: Response, next: NextFunction) {
  try {
    const cursor = req.query.cursor as string | undefined;
    const limit = Math.min(parseInt(req.query.limit as string) || 5, 50);
    const userId = req.user?.userId;
    const result = await commentService.getComments(req.params.postId as string, cursor, limit, userId);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function editComment(req: Request, res: Response, next: NextFunction) {
  try {
    const { content } = commentSchema.parse(req.body);
    const comment = await commentService.updateComment(
      req.params.commentId as string,
      req.user!.userId,
      content
    );
    res.json(comment);
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(new AppError(error.errors[0].message, 400, "VALIDATION_ERROR"));
    } else {
      next(error);
    }
  }
}

export async function removeComment(req: Request, res: Response, next: NextFunction) {
  try {
    await commentService.deleteComment(req.params.commentId as string, req.user!.userId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}
