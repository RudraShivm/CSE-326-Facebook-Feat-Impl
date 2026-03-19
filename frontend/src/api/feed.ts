import apiClient from "./client";
import { Post } from "./posts";

interface FeedResponse {
  posts: Post[];
  nextCursor: string | null;
  hasMore: boolean;
}

export async function getFeed(cursor?: string, limit: number = 10): Promise<FeedResponse> {
  const params = new URLSearchParams();
  if (cursor) params.set("cursor", cursor);
  params.set("limit", limit.toString());
  const res = await apiClient.get(`/posts?${params.toString()}`);
  return res.data;
}
