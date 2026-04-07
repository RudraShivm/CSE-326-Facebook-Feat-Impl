export interface RecentVisitProfile {
  id: string;
  firstName: string;
  lastName: string;
  profilePicture: string | null;
  bio: string | null;
}

export interface ShortcutItem {
  id: string;
  title: string;
  url: string;
  icon: string;
  kind: "profile" | "link";
  profileUserId?: string;
  profilePicture?: string | null;
  subtitle?: string | null;
}

const RECENT_VISITS_KEY = "recentProfileVisits";
const SHORTCUTS_KEY = "menuShortcuts";
const MAX_RECENT_VISITS = 3;
export const MAX_SHORTCUTS = 4;

function readJson<T>(key: string, fallback: T): T {
  try {
    const rawValue = localStorage.getItem(key);
    if (!rawValue) {
      return fallback;
    }

    return JSON.parse(rawValue) as T;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function setRecentVisits(recentVisits: RecentVisitProfile[]) {
  writeJson(RECENT_VISITS_KEY, recentVisits.slice(0, MAX_RECENT_VISITS));
}

export function setShortcuts(shortcuts: ShortcutItem[]) {
  writeJson(SHORTCUTS_KEY, shortcuts.slice(0, MAX_SHORTCUTS));
}

export function hydrateMenuStorage(
  recentVisits: RecentVisitProfile[],
  shortcuts: ShortcutItem[]
) {
  setRecentVisits(recentVisits);
  setShortcuts(shortcuts);
}

export function getRecentVisits(): RecentVisitProfile[] {
  return readJson<RecentVisitProfile[]>(RECENT_VISITS_KEY, []);
}

export function recordRecentVisit(profile: RecentVisitProfile, currentUserId?: string): RecentVisitProfile[] {
  if (!profile.id || profile.id === currentUserId) {
    return getRecentVisits();
  }

  const nextVisits = [
    profile,
    ...getRecentVisits().filter((item) => item.id !== profile.id),
  ].slice(0, MAX_RECENT_VISITS);

  setRecentVisits(nextVisits);
  return nextVisits;
}

export function removeRecentVisit(profileId: string): RecentVisitProfile[] {
  const nextVisits = getRecentVisits().filter((item) => item.id !== profileId);
  setRecentVisits(nextVisits);
  return nextVisits;
}

export function getShortcuts(): ShortcutItem[] {
  return readJson<ShortcutItem[]>(SHORTCUTS_KEY, []);
}

function getShortcutIdentity(shortcut: ShortcutItem) {
  return shortcut.kind === "profile" ? `profile:${shortcut.profileUserId}` : `link:${shortcut.url}`;
}

export function addShortcut(shortcut: ShortcutItem) {
  const currentShortcuts = getShortcuts();
  const nextShortcuts = [
    shortcut,
    ...currentShortcuts.filter((item) => getShortcutIdentity(item) !== getShortcutIdentity(shortcut)),
  ];
  const trimmedShortcuts = nextShortcuts.slice(0, MAX_SHORTCUTS);
  const droppedShortcut = nextShortcuts.length > MAX_SHORTCUTS ? nextShortcuts[MAX_SHORTCUTS] : null;

  setShortcuts(trimmedShortcuts);

  return {
    shortcuts: trimmedShortcuts,
    droppedShortcut,
  };
}

export function removeShortcut(shortcutId: string): ShortcutItem[] {
  const nextShortcuts = getShortcuts().filter((item) => item.id !== shortcutId);
  setShortcuts(nextShortcuts);
  return nextShortcuts;
}
