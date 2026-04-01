import apiClient from "./client";

export interface Post {
  id: string;
  content: string;
  imageUrl: string | null;
  videoUrl: string | null;
  visibility: "PUBLIC" | "FRIENDS" | "PRIVATE";
  likeCount: number;
  commentCount: number;
  shareCount: number;
  createdAt: string;
  updatedAt: string;
  isSaved?: boolean;
  authorId: string;
  author: {
    id: string;
    firstName: string;
    lastName: string;
    profilePicture: string | null;
  };
  sharedPostId?: string;
  sharedPost?: {
    id: string;
    content: string;
    imageUrl: string | null;
    videoUrl: string | null;
    createdAt: string;
    author: {
      id: string;
      firstName: string;
      lastName: string;
      profilePicture: string | null;
    };
  };
}

export interface CreatePostInput {
  content?: string;
  imageUrl?: string;
  videoUrl?: string;
  visibility?: "PUBLIC" | "FRIENDS" | "PRIVATE";
  sharedPostId?: string;
  sourcePostId?: string;
}

export async function createPost(data: CreatePostInput): Promise<Post> {
  const res = await apiClient.post("/posts", data);
  return res.data;
}

export async function getPost(postId: string): Promise<Post> {
  const res = await apiClient.get(`/posts/${postId}`);
  return res.data;
}

export async function updatePost(postId: string, data: Partial<CreatePostInput>): Promise<Post> {
  const res = await apiClient.patch(`/posts/${postId}`, data);
  return res.data;
}

export async function deletePost(postId: string): Promise<void> {
  await apiClient.delete(`/posts/${postId}`);
}
