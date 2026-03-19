import jwt from "jsonwebtoken";

// These MUST be set in .env — the app will crash if they're missing
const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || "dev-access-secret";
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "dev-refresh-secret";
const ACCESS_EXPIRY = (process.env.JWT_ACCESS_EXPIRY || "15m") as any;
const REFRESH_EXPIRY = (process.env.JWT_REFRESH_EXPIRY || "7d") as any;

export interface TokenPayload {
  userId: string;
  email: string;
}

/**
 * Generate an access token (short-lived).
 */
export function generateAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, ACCESS_SECRET, {
    expiresIn: ACCESS_EXPIRY,
  });
}

/**
 * Generate a refresh token (long-lived).
 */
export function generateRefreshToken(payload: TokenPayload): string {
  return jwt.sign(payload, REFRESH_SECRET, {
    expiresIn: REFRESH_EXPIRY,
  });
}

/**
 * Verify and decode an access token.
 * Returns the payload if valid, throws an error if expired/invalid.
 */
export function verifyAccessToken(token: string): TokenPayload {
  return jwt.verify(token, ACCESS_SECRET) as TokenPayload;
}

/**
 * Verify and decode a refresh token.
 */
export function verifyRefreshToken(token: string): TokenPayload {
  return jwt.verify(token, REFRESH_SECRET) as TokenPayload;
}

/**
 * Decode a token WITHOUT verifying it (useful for debugging).
 */
export function decodeToken(token: string): TokenPayload | null {
  const decoded = jwt.decode(token);
  return decoded as TokenPayload | null;
}
