import type { Request, Response, CookieOptions } from "express";

export const ACCESS_TOKEN_COOKIE_NAME = "accessToken";
export const ACTIVE_SESSION_COOKIE_NAME = "activeSessionId";
export const BROWSER_SESSION_COOKIE_NAME = "browserSessionId";
const ACCESS_TOKEN_MAX_AGE_MS = 15 * 60 * 1000;
const SESSION_COOKIE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

function getCookieOptions(maxAge = ACCESS_TOKEN_MAX_AGE_MS): CookieOptions {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge,
  };
}

function parseCookieHeader(cookieHeader?: string | null) {
  if (!cookieHeader) {
    return {};
  }

  return cookieHeader
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce<Record<string, string>>((accumulator, part) => {
      const separatorIndex = part.indexOf("=");
      if (separatorIndex === -1) {
        return accumulator;
      }

      const key = decodeURIComponent(part.slice(0, separatorIndex).trim());
      const value = decodeURIComponent(part.slice(separatorIndex + 1).trim());
      accumulator[key] = value;
      return accumulator;
    }, {});
}

export function getAccessTokenFromRequest(req: Request) {
  const cookies = parseCookieHeader(req.headers.cookie);
  return cookies[ACCESS_TOKEN_COOKIE_NAME] || null;
}

export function getActiveSessionIdFromRequest(req: Request) {
  const cookies = parseCookieHeader(req.headers.cookie);
  return cookies[ACTIVE_SESSION_COOKIE_NAME] || null;
}

export function getBrowserSessionIdFromRequest(req: Request) {
  const cookies = parseCookieHeader(req.headers.cookie);
  return cookies[BROWSER_SESSION_COOKIE_NAME] || null;
}

export function setAccessTokenCookie(res: Response, accessToken: string) {
  res.cookie(ACCESS_TOKEN_COOKIE_NAME, accessToken, getCookieOptions());
}

export function clearAccessTokenCookie(res: Response) {
  res.clearCookie(ACCESS_TOKEN_COOKIE_NAME, getCookieOptions());
}

export function setActiveSessionCookie(res: Response, sessionId: string) {
  res.cookie(ACTIVE_SESSION_COOKIE_NAME, sessionId, getCookieOptions(SESSION_COOKIE_MAX_AGE_MS));
}

export function clearActiveSessionCookie(res: Response) {
  res.clearCookie(ACTIVE_SESSION_COOKIE_NAME, getCookieOptions(SESSION_COOKIE_MAX_AGE_MS));
}

export function setBrowserSessionCookie(res: Response, browserSessionId: string) {
  res.cookie(BROWSER_SESSION_COOKIE_NAME, browserSessionId, getCookieOptions(SESSION_COOKIE_MAX_AGE_MS));
}

export function clearBrowserSessionCookie(res: Response) {
  res.clearCookie(BROWSER_SESSION_COOKIE_NAME, getCookieOptions(SESSION_COOKIE_MAX_AGE_MS));
}
