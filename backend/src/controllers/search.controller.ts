import { Request, Response, NextFunction } from "express";
import { searchAll } from "../services/search.service";

export async function search(req: Request, res: Response, next: NextFunction) {
  try {
    const q = (req.query.q as string) || "";
    const type = (req.query.type as "all" | "users" | "posts") || "all";
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    if (!q.trim()) {
      return res.json({ users: [], posts: [], userTotal: 0, postTotal: 0 });
    }

    const results = await searchAll(q.trim(), type, page, limit);
    res.json(results);
  } catch (err) {
    next(err);
  }
}
