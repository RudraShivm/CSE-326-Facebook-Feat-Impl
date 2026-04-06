import type { Post } from "../api/posts";
import { useCreatePost } from "../contexts/CreatePostContext";

interface UseCreatePostActionOptions {
  onPostCreated?: (post: Post) => void;
}

export function useCreatePostAction(options?: UseCreatePostActionOptions) {
  const { openCreatePost } = useCreatePost();

  return () => {
    openCreatePost(options);
  };
}
