-- Fix schema drift: rename 'id' to 'saved_post_id' in saved_posts (if needed)
-- and rename 'id' to 'block_id' in blocked_users (if needed).
-- Idempotent: skips if the column already has the correct name.

DO $$
BEGIN
  -- saved_posts: rename 'id' -> 'saved_post_id'
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'saved_posts' AND column_name = 'id'
  ) THEN
    ALTER TABLE "saved_posts" RENAME COLUMN "id" TO "saved_post_id";
  END IF;

  -- blocked_users: rename 'id' -> 'block_id'
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'blocked_users' AND column_name = 'id'
  ) THEN
    ALTER TABLE "blocked_users" RENAME COLUMN "id" TO "block_id";
  END IF;
END $$;
