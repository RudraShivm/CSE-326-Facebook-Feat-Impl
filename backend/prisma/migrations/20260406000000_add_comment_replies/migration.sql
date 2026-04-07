-- Migration: add_comment_replies
-- Adds parent_id self-reference to comments table to support
-- Facebook-style nested comment threads (one level deep).

-- AlterTable: add parent_id column (nullable, defaults to NULL = top-level)
ALTER TABLE "comments"
  ADD COLUMN "parent_id" TEXT;

-- CreateIndex: for fast lookup of all replies to a comment
CREATE INDEX "comments_parent_id_idx" ON "comments"("parent_id");

-- AddForeignKey: comments.parent_id → comments.comment_id (self-relation)
-- ON DELETE CASCADE ensures replies are removed when the parent is deleted.
ALTER TABLE "comments"
  ADD CONSTRAINT "comments_parent_id_fkey"
  FOREIGN KEY ("parent_id") REFERENCES "comments"("comment_id")
  ON DELETE CASCADE ON UPDATE CASCADE;
