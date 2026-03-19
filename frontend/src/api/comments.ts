import apiClient from "./client";

export interface Comment {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  authorId: string;
  postId: string;
  author: {
    id: string;
    firstName: string;
    lastName: string;
    profilePicture: string | null;
  };
  _count?: {
    reactions: number;
  };
}

interface CommentsResponse {
  comments: Comment[];
  nextCursor: string | null;
  hasMore: boolean;
}

export async function getComments(postId: string, cursor?: string): Promise<CommentsResponse> {
  const params = cursor ? `?cursor=${cursor}` : "";
  const res = await apiClient.get(`/posts/${postId}/comments${params}`);
  return res.data;
}

export async function addComment(postId: string, content: string): Promise<Comment> {
  const res = await apiClient.post(`/posts/${postId}/comments`, { content });
  return res.data;
}

export async function deleteComment(postId: string, commentId: string): Promise<void> {
  await apiClient.delete(`/posts/${postId}/comments/${commentId}`);
}

export async function updateComment(postId: string, commentId: string, content: string): Promise<Comment> {
  const res = await apiClient.patch(`/posts/${postId}/comments/${commentId}`, { content });
  return res.data;
}
