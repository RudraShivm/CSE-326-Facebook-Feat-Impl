import prisma from "../config/database";

export interface SearchResults {
  users: any[];
  posts: any[];
  userTotal: number;
  postTotal: number;
}

export async function searchAll(
  query: string,
  type: "all" | "users" | "posts" = "all",
  page: number = 1,
  limit: number = 10
): Promise<SearchResults> {
  const skip = (page - 1) * limit;

  let users: any[] = [];
  let posts: any[] = [];
  let userTotal = 0;
  let postTotal = 0;

  if (type === "all" || type === "users") {
    const [items, count] = await Promise.all([
      prisma.user.findMany({
        where: {
          OR: [
            { firstName: { contains: query, mode: "insensitive" } },
            { lastName: { contains: query, mode: "insensitive" } },
            { email: { contains: query, mode: "insensitive" } },
          ],
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          profilePicture: true,
          bio: true,
        },
        skip,
        take: limit,
        orderBy: { firstName: "asc" },
      }),
      prisma.user.count({
        where: {
          OR: [
            { firstName: { contains: query, mode: "insensitive" } },
            { lastName: { contains: query, mode: "insensitive" } },
            { email: { contains: query, mode: "insensitive" } },
          ],
        },
      }),
    ]);
    users = items;
    userTotal = count;
  }

  if (type === "all" || type === "posts") {
    const [items, count] = await Promise.all([
      prisma.post.findMany({
        where: {
          content: { contains: query, mode: "insensitive" },
          visibility: "PUBLIC",
        },
        select: {
          id: true,
          content: true,
          imageUrl: true,
          videoUrl: true,
          visibility: true,
          likeCount: true,
          commentCount: true,
          shareCount: true,
          createdAt: true,
          updatedAt: true,
          authorId: true,
          author: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              profilePicture: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.post.count({
        where: {
          content: { contains: query, mode: "insensitive" },
          visibility: "PUBLIC",
        },
      }),
    ]);
    posts = items;
    postTotal = count;
  }

  return { users, posts, userTotal, postTotal };
}
