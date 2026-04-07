CREATE TYPE "shortcut_kind" AS ENUM ('PROFILE', 'LINK');

CREATE TABLE "recent_profile_visits" (
  "recent_visit_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "visited_profile_id" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "recent_profile_visits_pkey" PRIMARY KEY ("recent_visit_id")
);

CREATE TABLE "user_shortcuts" (
  "shortcut_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "kind" "shortcut_kind" NOT NULL,
  "title" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "icon" TEXT NOT NULL,
  "profile_user_id" TEXT,
  "subtitle" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "user_shortcuts_pkey" PRIMARY KEY ("shortcut_id")
);

CREATE UNIQUE INDEX "recent_profile_visits_user_id_visited_profile_id_key"
ON "recent_profile_visits"("user_id", "visited_profile_id");

CREATE INDEX "recent_profile_visits_user_id_idx"
ON "recent_profile_visits"("user_id");

CREATE INDEX "recent_profile_visits_visited_profile_id_idx"
ON "recent_profile_visits"("visited_profile_id");

CREATE INDEX "user_shortcuts_user_id_idx"
ON "user_shortcuts"("user_id");

CREATE INDEX "user_shortcuts_profile_user_id_idx"
ON "user_shortcuts"("profile_user_id");

ALTER TABLE "recent_profile_visits"
ADD CONSTRAINT "recent_profile_visits_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "recent_profile_visits"
ADD CONSTRAINT "recent_profile_visits_visited_profile_id_fkey"
FOREIGN KEY ("visited_profile_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "user_shortcuts"
ADD CONSTRAINT "user_shortcuts_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "user_shortcuts"
ADD CONSTRAINT "user_shortcuts_profile_user_id_fkey"
FOREIGN KEY ("profile_user_id") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;
