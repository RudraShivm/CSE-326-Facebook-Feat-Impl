import { Request, Response, NextFunction } from "express";
import * as feedService from "../services/feed.service";

export async function getFeed(req: Request, res: Response, next: NextFunction) {
  try {
    const cursor = req.query.cursor as string | undefined;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
    const seed = (req.query.seed as string) || "default_seed";
    
    const feed = await feedService.generateFeed(req.user!.userId, cursor, limit, seed);
    res.json(feed);
  } catch (error) {
    next(error);
  }
}
