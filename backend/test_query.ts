import prisma from './src/config/database';

async function main() {
  const seed = "test12345";
  const userId = "cdd30737-0cfc-4ccc-aaae-0d8594ccbf1a"; // A random UUID format
  try {
    const res = await prisma.$queryRaw`
      SELECT "post_id" as id,
        (
          (("like_count" * 1) + ("comment_count" * 2) + ("share_count" * 3) + 1)
          / POW(EXTRACT(EPOCH FROM (NOW() - "created_at"))/3600 + 1, 1.5)
        ) * (0.8 + (ABS(hashtext("post_id"::text || ${seed}::text)) % 100) / 250.0) as score
      FROM "posts"
      WHERE "visibility" = 'PUBLIC'::"visibility" OR "author_id" = ${userId}
      ORDER BY score DESC
      LIMIT 2 OFFSET 0
    `;
    console.log("Success:", res);
  } catch (e) {
    console.error("Error:", e);
  }
}
main().finally(() => prisma.$disconnect());
