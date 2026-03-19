-- AlterTable
ALTER TABLE "users" ADD COLUMN     "cover_photo" TEXT,
ADD COLUMN     "instagram_link" TEXT,
ADD COLUMN     "job_status" TEXT,
ADD COLUMN     "linkedin_link" TEXT,
ADD COLUMN     "privacy_friend_requests" "visibility" NOT NULL DEFAULT 'PUBLIC',
ADD COLUMN     "privacy_friends_list" "visibility" NOT NULL DEFAULT 'PUBLIC',
ADD COLUMN     "privacy_future_posts" "visibility" NOT NULL DEFAULT 'PUBLIC',
ADD COLUMN     "relationship_status" TEXT;

-- CreateTable
CREATE TABLE "saved_posts" (
    "saved_post_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "post_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "saved_posts_pkey" PRIMARY KEY ("saved_post_id")
);

-- CreateTable
CREATE TABLE "blocked_users" (
    "block_id" TEXT NOT NULL,
    "blocker_id" TEXT NOT NULL,
    "blocked_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "blocked_users_pkey" PRIMARY KEY ("block_id")
);

-- CreateIndex
CREATE INDEX "saved_posts_user_id_idx" ON "saved_posts"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "saved_posts_user_id_post_id_key" ON "saved_posts"("user_id", "post_id");

-- CreateIndex
CREATE INDEX "blocked_users_blocker_id_idx" ON "blocked_users"("blocker_id");

-- CreateIndex
CREATE UNIQUE INDEX "blocked_users_blocker_id_blocked_id_key" ON "blocked_users"("blocker_id", "blocked_id");

-- AddForeignKey
ALTER TABLE "saved_posts" ADD CONSTRAINT "saved_posts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_posts" ADD CONSTRAINT "saved_posts_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "posts"("post_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blocked_users" ADD CONSTRAINT "blocked_users_blocker_id_fkey" FOREIGN KEY ("blocker_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blocked_users" ADD CONSTRAINT "blocked_users_blocked_id_fkey" FOREIGN KEY ("blocked_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;
