import { Request, Response, NextFunction } from "express";
import * as storageService from "../services/storage.service";
import { AppError } from "../middleware/error.middleware";

export async function uploadMedia(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.file) {
      return next(new AppError("No file provided", 400, "VALIDATION_ERROR"));
    }

    const publicUrl = await storageService.uploadFile(
      req.user!.userId,
      req.file.buffer,
      req.file.mimetype,
      req.file.originalname
    );

    res.json({ url: publicUrl });
  } catch (error) {
    next(error);
  }
}
