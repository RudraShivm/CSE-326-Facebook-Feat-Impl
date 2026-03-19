import { Request, Response, NextFunction } from "express";

/**
 * Custom error class with HTTP status code.
 *
 * Usage in routes/services:
 *   throw new AppError("Post not found", 404, "NOT_FOUND");
 */
export class AppError extends Error {
  public statusCode: number;
  public code: string;
  public isOperational: boolean;

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = "INTERNAL_ERROR"
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true; // Distinguishes from programming errors
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

/**
 * Express error handler — sends a consistent JSON error response.
 */
export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // If it's our custom AppError, use its status/code
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      code: err.code,
      message: err.message,
    });
    return;
  }

  // For unexpected errors, log the full stack trace
  console.error("💥 Unexpected error:", err);

  res.status(500).json({
    code: "INTERNAL_ERROR",
    message:
      process.env.NODE_ENV === "production"
        ? "An unexpected error occurred."
        : err.message,
  });
}
