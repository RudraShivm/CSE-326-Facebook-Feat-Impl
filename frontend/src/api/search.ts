import apiClient from "./client";
import { Post } from "./posts";

export interface SearchUser {
  id: string;
  firstName: string;
  lastName: string;
  profilePicture: string | null;
  bio: string | null;
}

export interface SearchResults {
  users: SearchUser[];
  posts: Post[];
  userTotal: number;
  postTotal: number;
}

export async function searchAll(
  q: string,
  type: "all" | "users" | "posts" = "all",
  page: number = 1,
  limit: number = 10
): Promise<SearchResults> {
  const params = new URLSearchParams({ q, type, page: String(page), limit: String(limit) });
  const res = await apiClient.get(`/search?${params.toString()}`);
  return res.data;
}
