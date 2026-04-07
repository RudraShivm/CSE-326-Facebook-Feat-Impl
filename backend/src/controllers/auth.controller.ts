import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import {
  registerUser,
  loginUser,
  refreshAccessToken,
  logoutUser,
  buildSessionUserSnapshot,
  toPublicAuthResponse,
} from "../services/auth.service";
import { AppError } from "../middleware/error.middleware";
import prisma from "../config/database";
import {
  clearAccessTokenCookie,
  clearActiveSessionCookie,
  clearBrowserSessionCookie,
  getActiveSessionIdFromRequest,
  getBrowserSessionIdFromRequest,
  getAccessTokenFromRequest,
  setActiveSessionCookie,
  setAccessTokenCookie,
  setBrowserSessionCookie,
} from "../utils/authCookies";
import {
  createSessionForUser,
  getRememberedAccounts,
  getSession,
  revokeSession,
  touchSession,
} from "../services/session.service";

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

const switchAccountSchema = z.object({
  sessionId: z.string().min(1, "Session id is required"),
});

// ── Register ──────────────────────────────────────────────
export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    // Validate request body
    const validatedData = registerSchema.parse(req.body);
    const result = await registerUser(validatedData);
    const browserSessionId = getBrowserSessionIdFromRequest(req);
    const session = await createSessionForUser(
      buildSessionUserSnapshot(result.user, validatedData.email),
      browserSessionId
    );
    setAccessTokenCookie(res, result.accessToken);
    setActiveSessionCookie(res, session.session.sessionId);
    setBrowserSessionCookie(res, session.browserSessionId);
    res.status(201).json(toPublicAuthResponse(result));
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
    const browserSessionId = getBrowserSessionIdFromRequest(req);
    const session = await createSessionForUser(
      buildSessionUserSnapshot(result.user, validatedData.email),
      browserSessionId
    );
    setAccessTokenCookie(res, result.accessToken);
    setActiveSessionCookie(res, session.session.sessionId);
    setBrowserSessionCookie(res, session.browserSessionId);
    res.status(200).json(toPublicAuthResponse(result));
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
    const accessToken = getAccessTokenFromRequest(req);
    const activeSessionId = getActiveSessionIdFromRequest(req);
    if (activeSessionId) {
      const revoked = await revokeSession(activeSessionId);
      if (revoked && revoked.remainingAccounts.length === 0) {
        clearBrowserSessionCookie(res);
      }
    }
    await logoutUser(accessToken);
    clearAccessTokenCookie(res);
    clearActiveSessionCookie(res);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

// ── Refresh ───────────────────────────────────────────────
export async function refresh(req: Request, res: Response, next: NextFunction) {
  try {
    const activeSessionId = getActiveSessionIdFromRequest(req);
    const browserSessionId = getBrowserSessionIdFromRequest(req);
    if (!activeSessionId || !browserSessionId) {
      throw new AppError("Invalid or expired session.", 401, "UNAUTHORIZED");
    }

    const session = await touchSession(activeSessionId);
    if (!session || session.browserSessionId !== browserSessionId) {
      throw new AppError("Invalid or expired session.", 401, "UNAUTHORIZED");
    }

    const result = await refreshAccessToken(session.user);
    setAccessTokenCookie(res, result.accessToken);
    res.status(200).json(result);
  } catch (error) {
    next(new AppError("Invalid or expired session.", 401, "UNAUTHORIZED"));
  }
}

// ── Current Session User ──────────────────────────────────
export async function me(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      throw new AppError("Authentication token is missing or expired.", 401, "UNAUTHORIZED");
    }

    const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
    if (!user) {
      throw new AppError("User not found.", 404, "NOT_FOUND");
    }

    res.status(200).json({
      userId: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      profilePicture: user.profilePicture,
      isActive: user.isActive,
    });
  } catch (error) {
    next(error);
  }
}

// ── Remembered Accounts ───────────────────────────────────
export async function accounts(req: Request, res: Response, next: NextFunction) {
  try {
    const browserSessionId = getBrowserSessionIdFromRequest(req);
    const rememberedAccounts = await getRememberedAccounts(browserSessionId);
    res.status(200).json({ accounts: rememberedAccounts });
  } catch (error) {
    next(error);
  }
}

// ── Switch Account ────────────────────────────────────────
export async function switchAccount(req: Request, res: Response, next: NextFunction) {
  try {
    const { sessionId } = switchAccountSchema.parse(req.body);
    const browserSessionId = getBrowserSessionIdFromRequest(req);
    if (!browserSessionId) {
      throw new AppError("No remembered accounts are available.", 401, "UNAUTHORIZED");
    }

    const session = await touchSession(sessionId);
    if (!session || session.browserSessionId !== browserSessionId) {
      throw new AppError("The selected account is no longer available.", 404, "NOT_FOUND");
    }

    const result = await refreshAccessToken(session.user);
    setAccessTokenCookie(res, result.accessToken);
    setActiveSessionCookie(res, session.sessionId);

    res.status(200).json({
      userId: session.user.userId,
      firstName: session.user.firstName,
      lastName: session.user.lastName,
      profilePicture: session.user.profilePicture,
      isActive: session.user.isActive,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(new AppError(error.errors[0].message, 400, "VALIDATION_ERROR"));
    } else {
      next(error);
    }
  }
}
