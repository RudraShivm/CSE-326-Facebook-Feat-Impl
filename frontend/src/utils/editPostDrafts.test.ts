import { describe, expect, it, vi } from "vitest";
import { getEditPostDraft, removeEditPostDraft, saveEditPostDraft } from "./editPostDrafts";

describe("editPostDrafts", () => {
  it("stores and restores an edit draft by post id", () => {
    vi.spyOn(Date, "now").mockReturnValue(1000);

    saveEditPostDraft({
      postId: "post-1",
      content: "draft text",
      visibility: "FRIENDS",
      imageUrl: null,
      videoUrl: null,
    });

    expect(getEditPostDraft("post-1")).toEqual({
      postId: "post-1",
      content: "draft text",
      visibility: "FRIENDS",
      imageUrl: null,
      videoUrl: null,
      updatedAt: 1000,
    });
  });

  it("keeps only the two most recent uncommitted edit drafts", () => {
    vi.spyOn(Date, "now")
      .mockReturnValueOnce(1000)
      .mockReturnValueOnce(2000)
      .mockReturnValueOnce(3000);

    saveEditPostDraft({
      postId: "post-1",
      content: "one",
      visibility: "PUBLIC",
      imageUrl: null,
      videoUrl: null,
    });
    saveEditPostDraft({
      postId: "post-2",
      content: "two",
      visibility: "PUBLIC",
      imageUrl: null,
      videoUrl: null,
    });
    saveEditPostDraft({
      postId: "post-3",
      content: "three",
      visibility: "PRIVATE",
      imageUrl: null,
      videoUrl: null,
    });

    expect(getEditPostDraft("post-3")?.content).toBe("three");
    expect(getEditPostDraft("post-2")?.content).toBe("two");
    expect(getEditPostDraft("post-1")).toBeNull();
  });

  it("removes a draft after the post is committed or deleted", () => {
    vi.spyOn(Date, "now").mockReturnValue(1000);

    saveEditPostDraft({
      postId: "post-1",
      content: "draft text",
      visibility: "FRIENDS",
      imageUrl: null,
      videoUrl: null,
    });

    removeEditPostDraft("post-1");

    expect(getEditPostDraft("post-1")).toBeNull();
  });
});
