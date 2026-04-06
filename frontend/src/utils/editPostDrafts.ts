import type { Post } from "../api/posts";

const EDIT_POST_DRAFTS_KEY = "facebook-edit-post-drafts";
const MAX_EDIT_POST_DRAFTS = 2;

export interface EditPostDraft {
  postId: string;
  content: string;
  visibility: Post["visibility"];
  imageUrl: string | null;
  videoUrl: string | null;
  updatedAt: number;
}

function readDrafts(): EditPostDraft[] {
  const raw = window.localStorage.getItem(EDIT_POST_DRAFTS_KEY);

  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeDrafts(drafts: EditPostDraft[]) {
  window.localStorage.setItem(EDIT_POST_DRAFTS_KEY, JSON.stringify(drafts));
}

export function getEditPostDraft(postId: string) {
  return readDrafts().find((draft) => draft.postId === postId) ?? null;
}

export function saveEditPostDraft(draft: Omit<EditPostDraft, "updatedAt">) {
  const nextDraft: EditPostDraft = {
    ...draft,
    updatedAt: Date.now(),
  };

  const drafts = readDrafts().filter((entry) => entry.postId !== draft.postId);
  drafts.unshift(nextDraft);
  writeDrafts(drafts.slice(0, MAX_EDIT_POST_DRAFTS));
}

export function removeEditPostDraft(postId: string) {
  const drafts = readDrafts().filter((draft) => draft.postId !== postId);
  writeDrafts(drafts);
}
