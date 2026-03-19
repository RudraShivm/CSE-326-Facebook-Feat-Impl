import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { registerUser, loginUser, refreshAccessToken, logoutUser } from "../services/auth.service";
import { AppError } from "../middleware/error.middleware";

// ── Validation Schemas (using Zod) ────────────────────────
// Zod validates the request body and gives clear error messages.

const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD format"),
});

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token is required"),
});

// ── Register ──────────────────────────────────────────────
export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    // Validate request body
    const validatedData = registerSchema.parse(req.body);
    const result = await registerUser(validatedData);
    res.status(201).json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      // Validation failed — return friendly error messages
      next(new AppError(error.errors[0].message, 400, "VALIDATION_ERROR"));
    } else {
      next(error);
    }
  }
}

// ── Login ─────────────────────────────────────────────────
export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const validatedData = loginSchema.parse(req.body);
    const result = await loginUser(validatedData);
    res.status(200).json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(new AppError(error.errors[0].message, 400, "VALIDATION_ERROR"));
    } else {
      next(error);
    }
  }
}

// ── Logout ────────────────────────────────────────────────
export async function logout(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      await logoutUser(token);
    }
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

// ── Refresh ───────────────────────────────────────────────
export async function refresh(req: Request, res: Response, next: NextFunction) {
  try {
    const { refreshToken } = refreshSchema.parse(req.body);
    const result = await refreshAccessToken(refreshToken);
    res.status(200).json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(new AppError(error.errors[0].message, 400, "VALIDATION_ERROR"));
    } else {
      next(new AppError("Invalid or expired refresh token.", 401, "UNAUTHORIZED"));
    }
  }
}
