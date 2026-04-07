import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CommentSection from "./CommentSection";
import type { Comment } from "../api/comments";

const getCommentsMock = vi.fn();
const getRepliesMock = vi.fn();
const deleteCommentMock = vi.fn().mockResolvedValue(undefined);

vi.mock("../contexts/AuthContext", () => ({
  useAuth: () => ({
    user: {
      userId: "user-1",
      firstName: "Test",
      lastName: "User",
      profilePicture: null,
      isActive: true,
    },
  }),
}));

vi.mock("../api/comments", async () => {
  const actual = await vi.importActual<typeof import("../api/comments")>("../api/comments");
  return {
    ...actual,
    getComments: (...args: unknown[]) => getCommentsMock(...args),
    getReplies: (...args: unknown[]) => getRepliesMock(...args),
    deleteComment: (...args: unknown[]) => deleteCommentMock(...args),
  };
});

vi.mock("../api/reactions", () => ({
  toggleCommentReaction: vi.fn().mockResolvedValue({ status: "added" }),
}));

const topLevelComment: Comment = {
  id: "comment-1",
  content: "Top level comment",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  authorId: "user-1",
  postId: "post-1",
  parentId: null,
  hasReacted: false,
  author: {
    id: "user-1",
    firstName: "Test",
    lastName: "User",
    profilePicture: null,
  },
  _count: {
    reactions: 0,
    replies: 2,
  },
  replies: [],
};

const replies: Comment[] = [
  {
    id: "reply-1",
    content: "First reply",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    authorId: "user-1",
    postId: "post-1",
    parentId: "comment-1",
    hasReacted: false,
    author: {
      id: "user-1",
      firstName: "Test",
      lastName: "User",
      profilePicture: null,
    },
    _count: {
      reactions: 0,
      replies: 0,
    },
    replies: [],
  },
  {
    id: "reply-2",
    content: "Second reply",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    authorId: "user-1",
    postId: "post-1",
    parentId: "comment-1",
    hasReacted: false,
    author: {
      id: "user-1",
      firstName: "Test",
      lastName: "User",
      profilePicture: null,
    },
    _count: {
      reactions: 0,
      replies: 0,
    },
    replies: [],
  },
];

describe("CommentSection threads", () => {
  beforeEach(() => {
    getCommentsMock.mockResolvedValue({
      comments: [topLevelComment],
      nextCursor: null,
      hasMore: false,
    });
    getRepliesMock.mockResolvedValue({
      replies,
      nextCursor: null,
      hasMore: false,
    });
  });

  it("loads replies and updates the thread count immediately after deleting a reply", async () => {
    const { container } = render(
      <MemoryRouter>
        <CommentSection postId="post-1" isOpen />
      </MemoryRouter>
    );

    expect(await screen.findByText("Top level comment")).toBeInTheDocument();

    const viewRepliesButton = screen.getByRole("button", { name: /View 2 replies/i });
    fireEvent.click(viewRepliesButton);

    expect(await screen.findByText("First reply")).toBeInTheDocument();
    expect(screen.getByText("Second reply")).toBeInTheDocument();
    expect(getRepliesMock).toHaveBeenCalledWith("post-1", "comment-1", undefined, 5);

    const firstReplyItem = container.querySelector("#comment-reply-1");
    expect(firstReplyItem).not.toBeNull();

    const editButton = firstReplyItem?.querySelector(".comment-edit-trigger");
    expect(editButton).not.toBeNull();
    fireEvent.click(editButton as Element);

    const deleteButton = firstReplyItem?.querySelector(".comment-delete-btn-inline");
    expect(deleteButton).not.toBeNull();
    fireEvent.click(deleteButton as Element);

    await waitFor(() => {
      expect(deleteCommentMock).toHaveBeenCalledWith("post-1", "reply-1");
      expect(screen.queryByText("First reply")).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Hide replies/i }));
    expect(screen.getByRole("button", { name: /View 1 reply/i })).toBeInTheDocument();
  });
});
