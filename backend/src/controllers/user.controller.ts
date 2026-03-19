import { Request, Response, NextFunction } from "express";
import * as userService from "../services/user.service";
import { AppError } from "../middleware/error.middleware";

// ── Get User Profile ──────────────────────────────────────
export async function getUser(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await userService.getUserById(req.params.userId as string);
    res.json(user);
  } catch (error) {
    next(error);
  }
}

// ── Update User Profile ───────────────────────────────────
export async function updateUser(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await userService.updateUser(req.params.userId as string, req.body);
    res.json(user);
  } catch (error) {
    next(error);
  }
}

// ── Save Post ─────────────────────────────────────────────
export async function savePostHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await userService.savePost(req.params.userId as string, req.params.postId as string);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

// ── Unsave Post ───────────────────────────────────────────
export async function unsavePostHandler(req: Request, res: Response, next: NextFunction) {
  try {
    await userService.unsavePost(req.params.userId as string, req.params.postId as string);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

// ── Get Saved Posts ───────────────────────────────────────
export async function getSavedPosts(req: Request, res: Response, next: NextFunction) {
  try {
    const cursor = req.query.cursor as string | undefined;
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);
    const result = await userService.getSavedPosts(req.params.userId as string, cursor, limit);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

// ── Block User ────────────────────────────────────────────
export async function blockUserHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { blockedId } = req.body;
    if (!blockedId) throw new AppError("blockedId is required.", 400, "VALIDATION_ERROR");
    const result = await userService.blockUserById(req.params.userId as string, blockedId);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

// ── Unblock User ──────────────────────────────────────────
export async function unblockUserHandler(req: Request, res: Response, next: NextFunction) {
  try {
    await userService.unblockUserById(req.params.userId as string, req.params.blockedId as string);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

// ── Get Blocked Users ─────────────────────────────────────
export async function getBlockedUsers(req: Request, res: Response, next: NextFunction) {
  try {
    const blocked = await userService.getBlockedUsers(req.params.userId as string);
    res.json(blocked);
  } catch (error) {
    next(error);
  }
}
