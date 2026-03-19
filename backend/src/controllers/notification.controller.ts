import { Request, Response, NextFunction } from "express";
import * as notifService from "../services/notification.service";

export async function getNotifications(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const result = await notifService.getNotifications(userId, page, limit);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function markAsRead(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;
    const id = req.params.id as string;
    await notifService.markAsRead(id, userId);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

export async function markAllAsRead(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;
    await notifService.markAllAsRead(userId);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

export async function getUnreadCount(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;
    const count = await notifService.getUnreadCount(userId);
    res.json({ count });
  } catch (err) {
    next(err);
  }
}
