import apiClient from "./client";
import type { RecentVisitProfile, ShortcutItem } from "../utils/globalMenuStorage";

export interface MenuPreferencesResponse {
  recentVisits: RecentVisitProfile[];
  shortcuts: ShortcutItem[];
}

export interface AddShortcutPayload {
  title: string;
  url: string;
  icon: string;
  kind: "profile" | "link";
  profileUserId?: string;
  subtitle?: string | null;
}

export interface AddShortcutResponse {
  shortcuts: ShortcutItem[];
  droppedShortcut: ShortcutItem | null;
}

export async function getMenuPreferences(userId: string): Promise<MenuPreferencesResponse> {
  const res = await apiClient.get(`/users/${userId}/menu-preferences`);
  return res.data;
}

export async function recordRecentVisitForUser(
  userId: string,
  profileId: string
): Promise<MenuPreferencesResponse> {
  const res = await apiClient.post(`/users/${userId}/recent-visits`, { profileId });
  return res.data;
}

export async function addShortcutForUser(
  userId: string,
  payload: AddShortcutPayload
): Promise<AddShortcutResponse> {
  const res = await apiClient.post(`/users/${userId}/shortcuts`, payload);
  return res.data;
}

export async function removeShortcutForUser(
  userId: string,
  shortcutId: string
): Promise<{ shortcuts: ShortcutItem[] }> {
  const res = await apiClient.delete(`/users/${userId}/shortcuts/${shortcutId}`);
  return res.data;
}
