import prisma from "../config/database";
import { getPostSelect } from "./post.service";

export async function generateFeed(userId: string, cursor?: string, limit: number = 20, seed: string = "default") {
  // If cursor is provided, use it for cursor-based pagination
  // Otherwise start from the beginning
  const cursorClause = cursor
    ? `AND "post_id" < ${`'${cursor}'`}`
    : "";

  // Use raw SQL to sort feed by Engagement Algorithm + Random Seed
  const rawPosts = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
    `SELECT "post_id" as id,
      (
        (("like_count" * 1) + ("comment_count" * 2) + ("share_count" * 3) + 1)
        / POW(EXTRACT(EPOCH FROM (NOW() - "created_at"))/3600 + 1, 1.5)
      ) * (0.8 + (ABS(hashtext("post_id"::text || $2::text)) % 100) / 250.0) as score
    FROM "posts"
    WHERE ("visibility" = 'PUBLIC'::"visibility" OR "author_id" = $1)
      ${cursorClause}
    ORDER BY score DESC
    LIMIT $3`,
    userId,
    seed,
    limit + 1
  );

  const hasMore = rawPosts.length > limit;
  const itemsIds = hasMore ? rawPosts.slice(0, limit) : rawPosts;
  const ids = itemsIds.map(p => p.id);

  if (ids.length === 0) {
    return { posts: [], hasMore: false, nextCursor: null };
  }

  const posts = await prisma.post.findMany({
    where: { id: { in: ids } },
    select: getPostSelect(userId),
  });

  // Sort natively mapped result based on the raw ordered response IDs
  const sortedPosts = ids.map(id => posts.find(p => p.id === id)).filter(Boolean);

  const mappedItems = sortedPosts.map((post: any) => {
    const { reactions, ...rest } = post;
    return {
      ...rest,
      hasReacted: reactions ? reactions.length > 0 : false,
    };
  });

  return {
    posts: mappedItems,
    nextCursor: hasMore ? mappedItems[mappedItems.length - 1].id : null,
    hasMore,
  };
}
