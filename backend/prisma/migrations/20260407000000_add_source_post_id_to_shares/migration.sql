ALTER TABLE "posts"
ADD COLUMN "source_post_id" TEXT;

CREATE INDEX "posts_source_post_id_idx" ON "posts"("source_post_id");
