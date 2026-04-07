import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "../contexts/AuthContext";
import PostCard from "./PostCard";
import type { Post } from "../api/posts";

const deletePostMock = vi.fn().mockResolvedValue(undefined);

vi.mock("../api/posts", async () => {
  const actual = await vi.importActual<typeof import("../api/posts")>("../api/posts");
  return {
    ...actual,
    deletePost: (...args: unknown[]) => deletePostMock(...args),
  };
});

const post: Post = {
  id: "post-1",
  content: "Owner post",
  imageUrl: null,
  videoUrl: null,
  visibility: "PUBLIC",
  likeCount: 0,
  commentCount: 0,
  shareCount: 0,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  authorId: "user-1",
  author: {
    id: "user-1",
    firstName: "Owner",
    lastName: "User",
    profilePicture: null,
  },
};

describe("PostCard owner actions", () => {
  beforeEach(() => {
    localStorage.setItem(
      "user",
      JSON.stringify({
        userId: "user-1",
        firstName: "Owner",
        lastName: "User",
        profilePicture: null,
        isActive: true,
      })
    );
  });

  it("shows edit and delete in the owner menu and deletes through the callback", async () => {
    const onPostDeleted = vi.fn();

    const { container } = render(
      <AuthProvider>
        <MemoryRouter>
          <PostCard post={post} onPostDeleted={onPostDeleted} />
        </MemoryRouter>
      </AuthProvider>
    );

    fireEvent.click(screen.getByRole("button", { name: "More options" }));

    expect(screen.getByText("Edit post")).toBeInTheDocument();
    expect(screen.getByText("Delete post")).toBeInTheDocument();
    const dropdown = screen.getByText("Delete post").closest(".post-dropdown-menu");
    expect(container.querySelector(".post-card")?.contains(dropdown)).toBe(false);

    fireEvent.click(screen.getByText("Delete post"));

    await waitFor(() => {
      expect(deletePostMock).toHaveBeenCalledWith("post-1");
      expect(onPostDeleted).toHaveBeenCalledWith("post-1");
    });
  });

  it("navigates to the edit page for owner edits", async () => {
    render(
      <AuthProvider>
        <MemoryRouter initialEntries={["/feed"]}>
          <Routes>
            <Route path="/feed" element={<PostCard post={post} onPostDeleted={vi.fn()} />} />
            <Route path="/post/:postId/edit" element={<div>Edit page</div>} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    );

    fireEvent.click(screen.getByRole("button", { name: "More options" }));
    fireEvent.click(screen.getByText("Edit post"));

    expect(await screen.findByText("Edit page")).toBeInTheDocument();
  });

  it("aligns the floating menu with the post card content edge", async () => {
    const { container } = render(
      <AuthProvider>
        <MemoryRouter>
          <PostCard post={post} onPostDeleted={vi.fn()} />
        </MemoryRouter>
      </AuthProvider>
    );

    const card = container.querySelector(".post-card") as HTMLElement;
    const button = screen.getByRole("button", { name: "More options" }) as HTMLButtonElement;

    vi.spyOn(card, "getBoundingClientRect").mockReturnValue({
      x: 100,
      y: 50,
      width: 320,
      height: 200,
      top: 50,
      right: 420,
      bottom: 250,
      left: 100,
      toJSON: () => ({}),
    });

    vi.spyOn(button, "getBoundingClientRect").mockReturnValue({
      x: 380,
      y: 60,
      width: 24,
      height: 24,
      top: 60,
      right: 404,
      bottom: 84,
      left: 380,
      toJSON: () => ({}),
    });

    fireEvent.click(button);

    const dropdown = await screen.findByText("Delete post");
    const menu = dropdown.closest(".post-dropdown-menu") as HTMLElement;
    expect(menu.style.right).toBe("620px");
  });
});
