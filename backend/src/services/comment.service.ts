import prisma from "../config/database";
import { AppError } from "../middleware/error.middleware";
import { createNotification } from "./notification.service";

// Extract comment mapping to dynamic function
export const getCommentSelect = (userId?: string) => ({
  id: true,
  content: true,
  createdAt: true,
  updatedAt: true,
  authorId: true,
  postId: true,
  author: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      profilePicture: true,
    },
  },
  _count: {
    select: {
      reactions: true,
    },
  },
  ...(userId ? {
    reactions: {
      where: { userId },
      select: { id: true },
    }
  } : {}),
});

// ── Create Comment ────────────────────────────────────────
export async function createComment(postId: string, userId: string, content: string) {
  // Verify the post exists
  const post = await prisma.post.findUnique({ where: { id: postId } });
  if (!post) throw new AppError("Post not found.", 404, "NOT_FOUND");

  // Create comment and increment commentCount atomically
  const [comment] = await prisma.$transaction([
    prisma.comment.create({
      data: { content, authorId: userId, postId },
      select: getCommentSelect(userId),
    }),
    prisma.post.update({
      where: { id: postId },
      data: { commentCount: { increment: 1 } },
    }),
  ]);

  // Notify the post author (unless they're commenting on their own post)
  if (post.authorId !== userId) {
    const actor = await prisma.user.findUnique({ where: { id: userId }, select: { firstName: true, lastName: true } });
    if (actor) {
      await createNotification(
        post.authorId,
        userId,
        "COMMENT",
        postId,
        `${actor.firstName} ${actor.lastName} commented on your post.`
      );
    }
  }

  return comment;
}

// ── Get Comments for Post ─────────────────────────────────
export async function getComments(
  postId: string,
  cursor?: string,
  limit: number = 10,
  userId?: string
) {
  const comments = await prisma.comment.findMany({
    where: { postId },
    select: getCommentSelect(userId),
    orderBy: { createdAt: "asc" }, // Oldest first, like Facebook
    take: limit + 1,
    ...(cursor && { cursor: { id: cursor }, skip: 1 }),
  });

  const hasMore = comments.length > limit;
  const items = hasMore ? comments.slice(0, limit) : comments;

  const mappedItems = items.map((c: any) => {
    const { reactions, ...rest } = c;
    return {
      ...rest,
      hasReacted: reactions ? reactions.length > 0 : false,
    };
  });

  return {
    comments: mappedItems,
    nextCursor: hasMore ? mappedItems[mappedItems.length - 1].id : null,
    hasMore,
  };
}

// ── Update Comment ────────────────────────────────────────
export async function updateComment(commentId: string, userId: string, content: string) {
  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    select: { authorId: true },
  });

  if (!comment) throw new AppError("Comment not found.", 404, "NOT_FOUND");
  if (comment.authorId !== userId) {
    throw new AppError("You can only edit your own comments.", 403, "FORBIDDEN");
  }

  return prisma.comment.update({
    where: { id: commentId },
    data: { content },
    select: getCommentSelect(userId),
  });
}

// ── Delete Comment ────────────────────────────────────────
export async function deleteComment(commentId: string, userId: string) {
  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    select: { authorId: true, postId: true },
  });

  if (!comment) throw new AppError("Comment not found.", 404, "NOT_FOUND");
  if (comment.authorId !== userId) {
    throw new AppError("You can only delete your own comments.", 403, "FORBIDDEN");
  }

  await prisma.$transaction([
    prisma.comment.delete({ where: { id: commentId } }),
    prisma.post.update({
      where: { id: comment.postId },
      data: { commentCount: { decrement: 1 } },
    }),
  ]);
}
