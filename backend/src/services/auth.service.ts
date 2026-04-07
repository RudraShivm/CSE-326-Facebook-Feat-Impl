import prisma from "../config/database";
import { hashPassword, comparePassword } from "../utils/password";
import {
  generateAccessToken,
  TokenPayload,
} from "../utils/jwt";
import { AppError } from "../middleware/error.middleware";
import redis from "../config/redis";
import type { SessionUserSnapshot } from "./session.service";


// ── Types ─────────────────────────────────────────────────
interface RegisterInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string; // ISO date string "1998-06-15"
}

interface LoginInput {
  email: string;
  password: string;
}

interface AuthResponse {
  accessToken: string;
  expiresIn: number;  // seconds
  user: {
    userId: string;
    firstName: string;
    lastName: string;
    profilePicture: string | null;
    isActive: boolean;
  };
}

export interface PublicAuthResponse {
  expiresIn: number;
  user: AuthResponse["user"];
}

// ── Register ──────────────────────────────────────────────
export async function registerUser(input: RegisterInput): Promise<AuthResponse> {
  // Check if email is already taken
  const existingUser = await prisma.user.findUnique({
    where: { email: input.email },
  });

  if (existingUser) {
    throw new AppError(
      "An account with this email address already exists.",
      409,
      "EMAIL_CONFLICT"
    );
  }

  // Hash the password before storing
  const hashedPassword = await hashPassword(input.password);

  // Create the user in the database
  const user = await prisma.user.create({
    data: {
      email: input.email,
      password: hashedPassword,
      firstName: input.firstName,
      lastName: input.lastName,
      dateOfBirth: new Date(input.dateOfBirth),
    },
  });

  // Generate tokens
  const tokenPayload: TokenPayload = { userId: user.id, email: user.email };
  const accessToken = generateAccessToken(tokenPayload);

  return {
    accessToken,
    expiresIn: 900, // 15 minutes in seconds
    user: {
      userId: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      profilePicture: user.profilePicture,
      isActive: user.isActive,
    },
  };
}

// ── Login ─────────────────────────────────────────────────
export async function loginUser(input: LoginInput): Promise<AuthResponse> {
  const user = await prisma.user.findUnique({
    where: { email: input.email },
  });

  if (!user) {
    throw new AppError("The email or password is incorrect.", 401, "INVALID_CREDENTIALS");
  }

  const passwordMatch = await comparePassword(input.password, user.password);
  if (!passwordMatch) {
    throw new AppError("The email or password is incorrect.", 401, "INVALID_CREDENTIALS");
  }

  const tokenPayload: TokenPayload = { userId: user.id, email: user.email };
  const accessToken = generateAccessToken(tokenPayload);

  return {
    accessToken,
    expiresIn: 900,
    user: {
      userId: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      profilePicture: user.profilePicture,
      isActive: user.isActive,
    },
  };
}

export function buildSessionUserSnapshot(resultUser: AuthResponse["user"], email: string): SessionUserSnapshot {
  return {
    ...resultUser,
    email,
  };
}

export function toPublicAuthResponse(result: AuthResponse): PublicAuthResponse {
  return {
    expiresIn: result.expiresIn,
    user: result.user,
  };
}

// ── Refresh Token / Session Refresh ───────────────────────
export async function refreshAccessToken(user: SessionUserSnapshot): Promise<{ accessToken: string; expiresIn: number }> {
  const newAccessToken = generateAccessToken({ userId: user.userId, email: user.email });
  return { accessToken: newAccessToken, expiresIn: 900 };
}

// ── Logout ────────────────────────────────────────────────
export async function logoutUser(accessToken?: string | null) {
  // Blacklist the access token for its remaining lifetime
  // (Assuming typical 15 min expiry, we'll cache it for 15 mins to be safe)
  const accessTokenTTL = 15 * 60; // 15 minutes

  if (accessToken) {
    await redis.set(`bl_token:${accessToken}`, "revoked", "EX", accessTokenTTL);
  }
}
