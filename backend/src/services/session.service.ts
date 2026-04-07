import crypto from "crypto";
import redis from "../config/redis";

const SESSION_PREFIX = "sess";
const BROWSER_PREFIX = "browser_sess";
const SESSION_TTL_SECONDS = 30 * 24 * 60 * 60;

export interface SessionUserSnapshot {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  profilePicture: string | null;
  isActive: boolean;
}

export interface StoredSession {
  sessionId: string;
  browserSessionId: string;
  user: SessionUserSnapshot;
  createdAt: string;
  lastActiveAt: string;
}

export interface RememberedAccount {
  sessionId: string;
  user: Omit<SessionUserSnapshot, "email">;
  lastActiveAt: string;
}

function sessionKey(sessionId: string) {
  return `${SESSION_PREFIX}:${sessionId}`;
}

function browserKey(browserSessionId: string) {
  return `${BROWSER_PREFIX}:${browserSessionId}`;
}

async function readJson<T>(key: string): Promise<T | null> {
  const raw = await redis.get(key);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

async function writeJson(key: string, value: unknown, ttlSeconds = SESSION_TTL_SECONDS) {
  await redis.set(key, JSON.stringify(value), "EX", ttlSeconds);
}

async function getBrowserAccounts(browserSessionId: string): Promise<RememberedAccount[]> {
  return (await readJson<RememberedAccount[]>(browserKey(browserSessionId))) || [];
}

async function setBrowserAccounts(browserSessionId: string, accounts: RememberedAccount[]) {
  await writeJson(browserKey(browserSessionId), accounts, SESSION_TTL_SECONDS);
}

export async function createSessionForUser(
  user: SessionUserSnapshot,
  browserSessionId?: string | null
) {
  const resolvedBrowserSessionId = browserSessionId || crypto.randomUUID();
  const sessionId = crypto.randomUUID();
  const timestamp = new Date().toISOString();

  const session: StoredSession = {
    sessionId,
    browserSessionId: resolvedBrowserSessionId,
    user,
    createdAt: timestamp,
    lastActiveAt: timestamp,
  };

  await writeJson(sessionKey(sessionId), session, SESSION_TTL_SECONDS);

  const existingAccounts = await getBrowserAccounts(resolvedBrowserSessionId);
  const nextAccounts: RememberedAccount[] = [
    {
      sessionId,
      user: {
        userId: user.userId,
        firstName: user.firstName,
        lastName: user.lastName,
        profilePicture: user.profilePicture,
        isActive: user.isActive,
      },
      lastActiveAt: timestamp,
    },
    ...existingAccounts.filter((account) => account.user.userId !== user.userId),
  ];

  await setBrowserAccounts(resolvedBrowserSessionId, nextAccounts);

  return {
    session,
    browserSessionId: resolvedBrowserSessionId,
  };
}

export async function getSession(sessionId: string) {
  return readJson<StoredSession>(sessionKey(sessionId));
}

export async function getRememberedAccounts(browserSessionId?: string | null) {
  if (!browserSessionId) {
    return [];
  }

  const accounts = await getBrowserAccounts(browserSessionId);
  const verifiedAccounts: RememberedAccount[] = [];

  for (const account of accounts) {
    const session = await getSession(account.sessionId);
    if (!session) {
      continue;
    }

    verifiedAccounts.push({
      sessionId: account.sessionId,
      user: {
        userId: session.user.userId,
        firstName: session.user.firstName,
        lastName: session.user.lastName,
        profilePicture: session.user.profilePicture,
        isActive: session.user.isActive,
      },
      lastActiveAt: session.lastActiveAt,
    });
  }

  if (verifiedAccounts.length !== accounts.length) {
    await setBrowserAccounts(browserSessionId, verifiedAccounts);
  }

  return verifiedAccounts;
}

export async function touchSession(sessionId: string) {
  const session = await getSession(sessionId);
  if (!session) {
    return null;
  }

  const nextSession: StoredSession = {
    ...session,
    lastActiveAt: new Date().toISOString(),
  };
  await writeJson(sessionKey(sessionId), nextSession, SESSION_TTL_SECONDS);

  const accounts = await getBrowserAccounts(session.browserSessionId);
  const nextAccounts = [
    {
      sessionId,
      user: {
        userId: nextSession.user.userId,
        firstName: nextSession.user.firstName,
        lastName: nextSession.user.lastName,
        profilePicture: nextSession.user.profilePicture,
        isActive: nextSession.user.isActive,
      },
      lastActiveAt: nextSession.lastActiveAt,
    },
    ...accounts.filter((account) => account.sessionId !== sessionId),
  ];
  await setBrowserAccounts(session.browserSessionId, nextAccounts);

  return nextSession;
}

export async function revokeSession(sessionId: string) {
  const session = await getSession(sessionId);
  if (!session) {
    return null;
  }

  await redis.del(sessionKey(sessionId));
  const accounts = await getBrowserAccounts(session.browserSessionId);
  const nextAccounts = accounts.filter((account) => account.sessionId !== sessionId);

  if (nextAccounts.length > 0) {
    await setBrowserAccounts(session.browserSessionId, nextAccounts);
  } else {
    await redis.del(browserKey(session.browserSessionId));
  }

  return {
    session,
    remainingAccounts: nextAccounts,
  };
}
