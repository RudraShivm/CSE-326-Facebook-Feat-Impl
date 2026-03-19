import apiClient from "./client";
import { Post } from "./posts";

export interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  profilePicture: string | null;
  coverPhoto: string | null;
  bio: string | null;
  jobStatus: string | null;
  relationshipStatus: string | null;
  instagramLink: string | null;
  linkedinLink: string | null;
  privacyFuturePosts: "PUBLIC" | "FRIENDS" | "PRIVATE";
  privacyFriendRequests: "PUBLIC" | "FRIENDS" | "PRIVATE";
  privacyFriendsList: "PUBLIC" | "FRIENDS" | "PRIVATE";
  createdAt: string;
}

export interface UpdateProfileInput {
  firstName?: string;
  lastName?: string;
  bio?: string | null;
  profilePicture?: string | null;
  coverPhoto?: string | null;
  jobStatus?: string | null;
  relationshipStatus?: string | null;
  instagramLink?: string | null;
  linkedinLink?: string | null;
  privacyFuturePosts?: "PUBLIC" | "FRIENDS" | "PRIVATE";
  privacyFriendRequests?: "PUBLIC" | "FRIENDS" | "PRIVATE";
  privacyFriendsList?: "PUBLIC" | "FRIENDS" | "PRIVATE";
}

export interface PaginatedPosts {
  posts: (Post & { isSaved?: boolean })[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface BlockedUser {
  id: string;
  blockerId: string;
  blockedId: string;
  createdAt: string;
  blocked: {
    id: string;
    firstName: string;
    lastName: string;
    profilePicture: string | null;
  };
}

export async function getProfile(userId: string): Promise<UserProfile> {
  const res = await apiClient.get(`/users/${userId}`);
  return res.data;
}

export async function updateProfile(userId: string, data: UpdateProfileInput): Promise<UserProfile> {
  const res = await apiClient.put(`/users/${userId}`, data);
  return res.data;
}

export async function getUserPosts(userId: string, cursor?: string, limit: number = 10): Promise<PaginatedPosts> {
  const params = new URLSearchParams();
  if (cursor) params.append("cursor", cursor);
  params.append("limit", limit.toString());
  const res = await apiClient.get(`/users/${userId}/posts?${params.toString()}`);
  return res.data;
}

export async function getSavedPosts(userId: string, cursor?: string, limit: number = 10): Promise<{ items: (Post & { isSaved?: boolean })[], nextCursor?: string }> {
  const params = new URLSearchParams();
  if (cursor) params.append("cursor", cursor);
  params.append("limit", limit.toString());
  const res = await apiClient.get(`/users/${userId}/saved-posts?${params.toString()}`);
  return res.data;
}

export async function savePost(userId: string, postId: string): Promise<void> {
  await apiClient.post(`/users/${userId}/saved-posts/${postId}`);
}

export async function unsavePost(userId: string, postId: string): Promise<void> {
  await apiClient.delete(`/users/${userId}/saved-posts/${postId}`);
}

export async function getBlockedUsers(userId: string): Promise<BlockedUser[]> {
  const res = await apiClient.get(`/users/${userId}/blocked`);
  return res.data;
}

export async function blockUser(userId: string, blockedId: string): Promise<void> {
  await apiClient.post(`/users/${userId}/block`, { blockedId });
}

export async function unblockUser(userId: string, blockedId: string): Promise<void> {
  await apiClient.delete(`/users/${userId}/block/${blockedId}`);
}
