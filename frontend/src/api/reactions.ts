import apiClient from "./client";

export type ReactionType = "LIKE" | "LOVE" | "HAHA" | "WOW" | "SAD" | "ANGRY";

export async function togglePostReaction(postId: string, type: ReactionType = "LIKE") {
  const res = await apiClient.post(`/posts/${postId}/reactions`, { type });
  return res.data;
}

export async function getPostReactions(postId: string) {
  const res = await apiClient.get(`/posts/${postId}/reactions`);
  return res.data;
}

export async function toggleCommentReaction(commentId: string, type: ReactionType = "LIKE") {
  const res = await apiClient.post(`/comments/${commentId}/reactions`, { type });
  return res.data;
}
