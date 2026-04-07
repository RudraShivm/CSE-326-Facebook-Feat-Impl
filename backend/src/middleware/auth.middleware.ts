import { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../utils/jwt";
import { AppError } from "./error.middleware";
import redis from "../config/redis";
import { getAccessTokenFromRequest } from "../utils/authCookies";

export async function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const token = getAccessTokenFromRequest(req);

    if (!token) {
      throw new AppError(
        "Authentication token is missing or expired.",
        401,
        "UNAUTHORIZED"
      );
    }

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
