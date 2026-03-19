-- CreateEnum: reaction_type
CREATE TYPE "reaction_type" AS ENUM ('LIKE', 'LOVE', 'HAHA', 'WOW', 'SAD', 'ANGRY');

-- CreateTable: reactions
CREATE TABLE "reactions" (
    "reaction_id" TEXT NOT NULL,
    "type"        "reaction_type" NOT NULL,
    "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id"     TEXT NOT NULL,
    "post_id"     TEXT,
    "comment_id"  TEXT,

    CONSTRAINT "reactions_pkey" PRIMARY KEY ("reaction_id")
);

-- CreateIndex
CREATE INDEX "reactions_post_id_idx" ON "reactions"("post_id");
CREATE INDEX "reactions_comment_id_idx" ON "reactions"("comment_id");

-- Constraints: prevent multiple reactions from same user on same target
CREATE UNIQUE INDEX "reactions_user_id_post_id_key" ON "reactions"("user_id", "post_id");
CREATE UNIQUE INDEX "reactions_user_id_comment_id_key" ON "reactions"("user_id", "comment_id");

-- AddForeignKey: reactions.user_id → users.user_id
ALTER TABLE "reactions"
  ADD CONSTRAINT "reactions_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("user_id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: reactions.post_id → posts.post_id
ALTER TABLE "reactions"
  ADD CONSTRAINT "reactions_post_id_fkey"
  FOREIGN KEY ("post_id") REFERENCES "posts"("post_id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: reactions.comment_id → comments.comment_id
ALTER TABLE "reactions"
  ADD CONSTRAINT "reactions_comment_id_fkey"
  FOREIGN KEY ("comment_id") REFERENCES "comments"("comment_id")
  ON DELETE CASCADE ON UPDATE CASCADE;
