-- CreateTable: comments
CREATE TABLE "comments" (
    "comment_id"  TEXT NOT NULL,
    "content"     TEXT NOT NULL,
    "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"  TIMESTAMP(3) NOT NULL,
    "author_id"   TEXT NOT NULL,
    "post_id"     TEXT NOT NULL,

    CONSTRAINT "comments_pkey" PRIMARY KEY ("comment_id")
);

-- CreateIndex
CREATE INDEX "comments_post_id_idx" ON "comments"("post_id");
CREATE INDEX "comments_author_id_idx" ON "comments"("author_id");

-- AddForeignKey: comments.author_id → users.user_id
ALTER TABLE "comments"
  ADD CONSTRAINT "comments_author_id_fkey"
  FOREIGN KEY ("author_id") REFERENCES "users"("user_id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: comments.post_id → posts.post_id
ALTER TABLE "comments"
  ADD CONSTRAINT "comments_post_id_fkey"
  FOREIGN KEY ("post_id") REFERENCES "posts"("post_id")
  ON DELETE CASCADE ON UPDATE CASCADE;
