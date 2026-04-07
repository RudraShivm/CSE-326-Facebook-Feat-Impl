import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "../contexts/AuthContext";
import { AppToastProvider } from "../contexts/AppToastContext";
import { CreatePostProvider } from "../contexts/CreatePostContext";
import type { Post } from "../api/posts";
import SinglePostPage from "./SinglePostPage";

vi.mock("../components/CommentSection", () => ({
  default: () => <div data-testid="comment-section" />,
}));

vi.mock("../api/posts", async () => {
  const actual = await vi.importActual<typeof import("../api/posts")>("../api/posts");
  const fakePost: Post = {
    id: "post-1",
    content: "Hello",
    imageUrl: null,
    videoUrl: null,
    visibility: "PUBLIC",
    likeCount: 0,
    commentCount: 0,
    shareCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    authorId: "user-2",
    author: {
      id: "user-2",
      firstName: "Test",
      lastName: "Author",
      profilePicture: null,
    },
  };

  return {
    ...actual,
    getPost: vi.fn().mockResolvedValue(fakePost),
  };
});

describe("SinglePostPage", () => {
  beforeEach(() => {
    localStorage.setItem(
      "user",
      JSON.stringify({
        userId: "user-1",
        firstName: "Viewer",
        lastName: "User",
        profilePicture: null,
        isActive: true,
      })
    );
  });

  it("shows the common navigation chrome and global menu launcher", async () => {
    render(
      <AuthProvider>
        <AppToastProvider>
          <CreatePostProvider>
            <MemoryRouter initialEntries={["/post/post-1"]}>
              <Routes>
                <Route path="/post/:postId" element={<SinglePostPage />} />
              </Routes>
            </MemoryRouter>
          </CreatePostProvider>
        </AppToastProvider>
      </AuthProvider>
    );

    await waitFor(() => expect(screen.getByText("Hello")).toBeInTheDocument());

    expect(screen.getByRole("button", { name: "Search" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Notifications" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open menu" })).toBeInTheDocument();
  });

  it("shows delete in the three-dots menu when viewing your own post", async () => {
    localStorage.setItem(
      "user",
      JSON.stringify({
        userId: "user-2",
        firstName: "Test",
        lastName: "Author",
        profilePicture: null,
        isActive: true,
      })
    );

    render(
      <AuthProvider>
        <AppToastProvider>
          <CreatePostProvider>
            <MemoryRouter initialEntries={["/post/post-1"]}>
              <Routes>
                <Route path="/post/:postId" element={<SinglePostPage />} />
              </Routes>
            </MemoryRouter>
          </CreatePostProvider>
        </AppToastProvider>
      </AuthProvider>
    );

    await waitFor(() => expect(screen.getByText("Hello")).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: "More options" }));

    expect(await screen.findByText("Delete post")).toBeInTheDocument();
  });
});
