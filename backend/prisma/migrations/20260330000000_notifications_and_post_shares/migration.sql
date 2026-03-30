-- AlterTable
ALTER TABLE "posts"
ADD COLUMN "shared_post_id" TEXT;

-- CreateIndex
CREATE INDEX "posts_shared_post_id_idx" ON "posts"("shared_post_id");

-- AddForeignKey
ALTER TABLE "posts"
ADD CONSTRAINT "posts_shared_post_id_fkey"
FOREIGN KEY ("shared_post_id")
REFERENCES "posts"("post_id")
ON DELETE SET NULL
ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "notifications" (
    "notification_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" TEXT NOT NULL,
    "actor_id" TEXT NOT NULL,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("notification_id")
);

-- CreateIndex
CREATE INDEX "notifications_user_id_created_at_idx" ON "notifications"("user_id", "created_at");

-- AddForeignKey
ALTER TABLE "notifications"
ADD CONSTRAINT "notifications_user_id_fkey"
FOREIGN KEY ("user_id")
REFERENCES "users"("user_id")
ON DELETE CASCADE
ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications"
ADD CONSTRAINT "notifications_actor_id_fkey"
FOREIGN KEY ("actor_id")
REFERENCES "users"("user_id")
ON DELETE CASCADE
ON UPDATE CASCADE;
