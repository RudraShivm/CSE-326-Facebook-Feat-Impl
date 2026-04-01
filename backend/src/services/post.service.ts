import { Visibility } from "@prisma/client";
import prisma from "../config/database";
import { AppError } from "../middleware/error.middleware";
import { createNotification } from "./notification.service";

// ── Types ─────────────────────────────────────────────────
interface CreatePostInput {
  content?: string;
  imageUrl?: string;
  videoUrl?: string;
  visibility?: Visibility;
  sharedPostId?: string;
  sourcePostId?: string;
}

interface UpdatePostInput {
  content?: string;
  imageUrl?: string;
  videoUrl?: string;
  visibility?: Visibility;
}

// Reusable select — what fields to return for a post
export const getPostSelect = (userId?: string) => ({
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
  sharedPostId: true,
  sharedPost: {
    select: {
      id: true,
      content: true,
      imageUrl: true,
      videoUrl: true,
      createdAt: true,
      author: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          profilePicture: true,
        }
      }
    }
  },
  ...(userId ? {
    reactions: {
      where: { userId },
      select: { id: true },
    }
  } : {}),
});

// ── Create Post ───────────────────────────────────────────
export async function createPost(userId: string, input: CreatePostInput) {
  if (input.sharedPostId) {
    const originalPost = await prisma.post.update({
      where: { id: input.sharedPostId },
      data: { shareCount: { increment: 1 } },
    });

    // Notify the original post author about the share
    if (originalPost.authorId !== userId) {
      const actor = await prisma.user.findUnique({
        where: { id: userId },
        select: { firstName: true, lastName: true },
      });
      if (actor) {
        await createNotification(
          originalPost.authorId,
          userId,
          "SHARE",
          input.sharedPostId,
          `${actor.firstName} ${actor.lastName} shared your post.`
        );
      }
    }
  }

  if (input.sourcePostId && input.sourcePostId !== input.sharedPostId) {
    await prisma.post.update({
      where: { id: input.sourcePostId },
      data: { shareCount: { increment: 1 } },
    });
  }

  const post = await prisma.post.create({
    data: {
      content: input.content || "",
      imageUrl: input.imageUrl || null,
      videoUrl: input.videoUrl || null,
      visibility: input.visibility || "PUBLIC",
      authorId: userId,
      sharedPostId: input.sharedPostId || null,
    },
    select: getPostSelect(userId),
  });

  const { reactions, ...rest } = post as any;
  return { ...rest, hasReacted: reactions ? reactions.length > 0 : false };
}

// ── Get Single Post ───────────────────────────────────────
export async function getPostById(postId: string, requesterId: string) {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: getPostSelect(requesterId),
  });

  if (!post) {
    throw new AppError("Post not found.", 404, "NOT_FOUND");
  }

  // Visibility check
  if (post.visibility === "PRIVATE" && post.authorId !== requesterId) {
    throw new AppError("Post not found.", 404, "NOT_FOUND");
  }

  // FRIENDS visibility will be enforced once Friendship model is added
  // For now, FRIENDS posts are visible to all authenticated users

  const { reactions, ...rest } = post as any;
  return { ...rest, hasReacted: reactions ? reactions.length > 0 : false };
}

// ── Update Post ───────────────────────────────────────────
export async function updatePost(postId: string, userId: string, input: UpdatePostInput) {
  // First check if the post exists and belongs to the user
  const existingPost = await prisma.post.findUnique({
    where: { id: postId },
    select: { authorId: true },
  });

  if (!existingPost) {
    throw new AppError("Post not found.", 404, "NOT_FOUND");
  }

  if (existingPost.authorId !== userId) {
    throw new AppError("You can only edit your own posts.", 403, "FORBIDDEN");
  }

  const updated = await prisma.post.update({
    where: { id: postId },
    data: {
      ...(input.content !== undefined && { content: input.content }),
      ...(input.imageUrl !== undefined && { imageUrl: input.imageUrl }),
      ...(input.videoUrl !== undefined && { videoUrl: input.videoUrl }),
      ...(input.visibility !== undefined && { visibility: input.visibility }),
    },
    select: getPostSelect(userId),
  });

  const { reactions, ...rest } = updated as any;
  return { ...rest, hasReacted: reactions ? reactions.length > 0 : false };
}

// ── Delete Post ───────────────────────────────────────────
export async function deletePost(postId: string, userId: string) {
  const existingPost = await prisma.post.findUnique({
    where: { id: postId },
    select: { authorId: true },
  });

  if (!existingPost) {
    throw new AppError("Post not found.", 404, "NOT_FOUND");
  }

  if (existingPost.authorId !== userId) {
    throw new AppError("You can only delete your own posts.", 403, "FORBIDDEN");
  }

  await prisma.post.delete({ where: { id: postId } });
}

// ── Get User's Posts ──────────────────────────────────────
export async function getUserPosts(
  userId: string,
  requesterId: string,
  cursor?: string,
  limit: number = 10
) {
  const posts = await prisma.post.findMany({
    where: {
      authorId: userId,
      // If not the author, hide PRIVATE posts
      ...(userId !== requesterId && {
        visibility: { not: "PRIVATE" },
      }),
    },
    select: getPostSelect(requesterId),
    orderBy: { createdAt: "desc" },
    take: limit + 1, // Fetch one extra to check if there are more
    ...(cursor && { cursor: { id: cursor }, skip: 1 }),
  });

  const hasMore = posts.length > limit;
  const items = hasMore ? posts.slice(0, limit) : posts;

  const mappedItems = items.map((post: any) => {
    const { reactions, ...rest } = post;
    return { ...rest, hasReacted: reactions ? reactions.length > 0 : false };
  });

  return {
    posts: mappedItems,
    nextCursor: hasMore ? mappedItems[mappedItems.length - 1].id : null,
    hasMore,
  };
}
