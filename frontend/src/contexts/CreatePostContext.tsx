import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import type { Post } from "../api/posts";
import CreatePostModal from "../components/CreatePostModal";
import { useAppToast } from "./AppToastContext";

interface CreatePostOptions {
  onPostCreated?: (post: Post) => void;
}

interface CreatePostContextValue {
  openCreatePost: (options?: CreatePostOptions) => void;
  closeCreatePost: () => void;
}

const CreatePostContext = createContext<CreatePostContextValue | null>(null);

export function CreatePostProvider({ children }: { children: React.ReactNode }) {
  const { showToast } = useAppToast();
  const [isOpen, setIsOpen] = useState(false);
  const onPostCreatedRef = useRef<CreatePostOptions["onPostCreated"]>(undefined);

  const closeCreatePost = useCallback(() => {
    setIsOpen(false);
    onPostCreatedRef.current = undefined;
  }, []);

  const openCreatePost = useCallback((options?: CreatePostOptions) => {
    onPostCreatedRef.current = options?.onPostCreated;
    setIsOpen(true);
  }, []);

  const handlePostCreated = useCallback(
    (post: Post) => {
      onPostCreatedRef.current?.(post);
      showToast("Post created successfully!");
    },
    [showToast]
  );

  const value = useMemo(
    () => ({
      openCreatePost,
      closeCreatePost,
    }),
    [closeCreatePost, openCreatePost]
  );

  return (
    <CreatePostContext.Provider value={value}>
      {children}
      <CreatePostModal isOpen={isOpen} onClose={closeCreatePost} onPostCreated={handlePostCreated} />
    </CreatePostContext.Provider>
  );
}

export function useCreatePost() {
  const context = useContext(CreatePostContext);

  if (!context) {
    throw new Error("useCreatePost must be used within a CreatePostProvider");
  }

  return context;
}
