-- CreateEnum: visibility
CREATE TYPE "visibility" AS ENUM ('PUBLIC', 'FRIENDS', 'PRIVATE');

-- CreateTable: posts
CREATE TABLE "posts" (
    "post_id"       TEXT NOT NULL,
    "content"       TEXT NOT NULL,
    "image_url"     TEXT,
    "video_url"     TEXT,
    "visibility"    "visibility" NOT NULL DEFAULT 'PUBLIC',
    "like_count"    INTEGER NOT NULL DEFAULT 0,
    "comment_count" INTEGER NOT NULL DEFAULT 0,
    "share_count"   INTEGER NOT NULL DEFAULT 0,
    "created_at"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"    TIMESTAMP(3) NOT NULL,
    "author_id"     TEXT NOT NULL,

    CONSTRAINT "posts_pkey" PRIMARY KEY ("post_id")
);

-- CreateIndex: faster lookup by author
CREATE INDEX "posts_author_id_idx" ON "posts"("author_id");

-- CreateIndex: faster ordering by creation time (for feed)
CREATE INDEX "posts_created_at_idx" ON "posts"("created_at");

-- AddForeignKey: posts.author_id → users.user_id
-- onDelete: CASCADE means deleting a user also deletes their posts
ALTER TABLE "posts"
  ADD CONSTRAINT "posts_author_id_fkey"
  FOREIGN KEY ("author_id")
  REFERENCES "users"("user_id")
  ON DELETE CASCADE
  ON UPDATE CASCADE;
