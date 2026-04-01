import prisma from "../config/database";
import { getPostSelect } from "./post.service";

interface FeedCursor {
  offset: number;
  asOf: string;
}

function decodeFeedCursor(cursor?: string): FeedCursor | null {
  if (!cursor) {
    return null;
  }

  try {
    const parsed = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"));

    if (
      typeof parsed.offset !== "number" ||
      parsed.offset < 0 ||
      typeof parsed.asOf !== "string" ||
      Number.isNaN(Date.parse(parsed.asOf))
    ) {
      return null;
    }

    return {
      offset: parsed.offset,
      asOf: parsed.asOf,
    };
  } catch {
    return null;
  }
}

function encodeFeedCursor(cursor: FeedCursor): string {
  return Buffer.from(JSON.stringify(cursor)).toString("base64url");
}

export async function generateFeed(userId: string, cursor?: string, limit: number = 20, seed: string = "default") {
  const parsedCursor = decodeFeedCursor(cursor);
  const offset = parsedCursor?.offset ?? 0;
  const asOf = parsedCursor?.asOf ?? new Date().toISOString();

  // Keep pagination stable by using a fixed snapshot timestamp and offset for the session.
  const rawPosts = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
    `SELECT "post_id" as id,
      (
        (("like_count" * 1) + ("comment_count" * 2) + ("share_count" * 3) + 1)
        / POW(EXTRACT(EPOCH FROM (($2)::timestamptz - "created_at"))/3600 + 1, 1.5)
      ) * (0.8 + (ABS(hashtext("post_id"::text || $3::text)) % 100) / 250.0) as score
    FROM "posts"
    WHERE ("visibility" = 'PUBLIC'::"visibility" OR "author_id" = $1)
      AND "created_at" <= ($2)::timestamptz
    ORDER BY score DESC, "post_id" DESC
    OFFSET $4
    LIMIT $5`,
    userId,
    asOf,
    seed,
    offset,
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
    nextCursor: hasMore
      ? encodeFeedCursor({
          offset: offset + mappedItems.length,
          asOf,
        })
      : null,
    hasMore,
  };
}
