import { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../utils/jwt";
import { AppError } from "./error.middleware";
import redis from "../config/redis";

export async function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Get the Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new AppError(
        "Authentication token is missing or expired.",
        401,
        "UNAUTHORIZED"
      );
    }

    // Extract the token (remove "Bearer " prefix)
    const token = authHeader.split(" ")[1];

    // Check if token is blacklisted in Redis (from logout)
    const isBlacklisted = await redis.get(`bl_token:${token}`);
    if (isBlacklisted) {
      throw new AppError(
        "Authentication token has been revoked.",
        401,
        "UNAUTHORIZED"
      );
    }

    // Verify and decode the token
    const payload = verifyAccessToken(token);

    // Attach user data to the request object
    req.user = payload;

    next(); // Proceed to the route handler
  } catch (error) {
    // JWT verification failed (expired, invalid signature, etc.)
    next(
      new AppError(
        "Authentication token is missing or expired.",
        401,
        "UNAUTHORIZED"
      )
    );
  }
}
