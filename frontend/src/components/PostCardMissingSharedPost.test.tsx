import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";
import { AuthProvider } from "../contexts/AuthContext";
import type { Post } from "../api/posts";
import PostCard from "./PostCard";

const post: Post = {
  id: "shared-post-1",
  content: "My shared caption",
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
  sourcePostId: "original-post-1",
  sharedPostId: undefined,
  sharedPost: undefined,
};

describe("PostCard missing shared post state", () => {
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

  it("shows a placeholder card when the original shared post was deleted", () => {
    render(
      <AuthProvider>
        <MemoryRouter>
          <PostCard post={post} />
        </MemoryRouter>
      </AuthProvider>
    );

    expect(screen.getByText("Original post unavailable")).toBeInTheDocument();
    expect(
      screen.getByText("This shared post is no longer available because the original post was deleted.")
    ).toBeInTheDocument();
  });
});
