import prisma from "../config/database";
import { hashPassword, comparePassword } from "../utils/password";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  TokenPayload,
} from "../utils/jwt";
import { AppError } from "../middleware/error.middleware";
import redis from "../config/redis";


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
  refreshToken: string;
  expiresIn: number;  // seconds
  user: {
    userId: string;
    firstName: string;
    lastName: string;
    profilePicture: string | null;
    isActive: boolean;
  };
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
  const refreshToken = generateRefreshToken(tokenPayload);

  return {
    accessToken,
    refreshToken,
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
  const refreshToken = generateRefreshToken(tokenPayload);

  return {
    accessToken,
    refreshToken,
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

// ── Refresh Token ─────────────────────────────────────────
export async function refreshAccessToken(refreshTokenStr: string): Promise<{ accessToken: string; expiresIn: number }> {
  // Check if token is locally blacklisted in Redis (from logout)
  const isBlacklisted = await redis.get(`bl_token:${refreshTokenStr}`);
  if (isBlacklisted) {
    throw new AppError("Refresh token has been revoked.", 401, "UNAUTHORIZED");
  }

  const payload = verifyRefreshToken(refreshTokenStr);
  const newAccessToken = generateAccessToken({ userId: payload.userId, email: payload.email });
  return { accessToken: newAccessToken, expiresIn: 900 };
}

// ── Logout ────────────────────────────────────────────────
export async function logoutUser(accessToken: string) {
  // Blacklist the access token for its remaining lifetime
  // (Assuming typical 15 min expiry, we'll cache it for 15 mins to be safe)
  const TTL = 15 * 60; // 15 minutes

  if (accessToken) {
    await redis.set(`bl_token:${accessToken}`, "revoked", "EX", TTL);
  }
}
