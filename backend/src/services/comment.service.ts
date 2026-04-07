import prisma from "../config/database";
import { AppError } from "../middleware/error.middleware";
import { createNotification } from "./notification.service";

const authorSelect = {
  id: true,
  firstName: true,
  lastName: true,
  profilePicture: true,
};

export const getCommentSelect = (userId?: string) => ({
  id: true,
  content: true,
  createdAt: true,
  updatedAt: true,
  authorId: true,
  postId: true,
  parentId: true,
  author: { select: authorSelect },
  _count: {
    select: {
      reactions: true,
      replies: true,
    },
  },
  ...(userId
    ? {
        reactions: {
          where: { userId },
          select: { id: true },
        },
      }
    : {}),
});

// Reply select — same but no further nesting
const getReplySelect = (userId?: string) => ({
  id: true,
  content: true,
  createdAt: true,
  updatedAt: true,
  authorId: true,
  postId: true,
  parentId: true,
  author: { select: authorSelect },
  _count: { select: { reactions: true, replies: true } },
  ...(userId
    ? {
        reactions: {
          where: { userId },
          select: { id: true },
        },
      }
    : {}),
});

// Helper to map raw Prisma result → comment/reply DTO
function mapComment(c: any) {
  const { reactions, ...rest } = c;
  return {
    ...rest,
    hasReacted: reactions ? reactions.length > 0 : false,
  };
}

// ── Create Comment (or Reply) ──────────────────────────────
export async function createComment(
  postId: string,
  userId: string,
  content: string,
  parentId?: string
) {
  // Verify the post exists
  const post = await prisma.post.findUnique({ where: { id: postId } });
  if (!post) throw new AppError("Post not found.", 404, "NOT_FOUND");

  // If this is a reply, validate the parent
  if (parentId) {
    const parent = await prisma.comment.findUnique({
      where: { id: parentId },
      select: { postId: true, authorId: true },
    });
    if (!parent) throw new AppError("Parent comment not found.", 404, "NOT_FOUND");
    if (parent.postId !== postId)
      throw new AppError("Parent comment does not belong to this post.", 400, "BAD_REQUEST");

    // Create reply (no post counter bump)
    const reply = await prisma.comment.create({
      data: { content, authorId: userId, postId, parentId },
      select: getReplySelect(userId),
    });

    // Notify the parent comment's author (reuse parent from above)
    if (parent.authorId !== userId) {
      const actor = await prisma.user.findUnique({
        where: { id: userId },
        select: { firstName: true, lastName: true },
      });
      if (actor) {
        await createNotification(
          parent.authorId,
          userId,
          "COMMENT_REPLY",
          parentId,
          `${actor.firstName} ${actor.lastName} replied to your comment.`
        );
      }
    }

    return mapComment(reply);
  }

  // Top-level comment + post counter bump (atomic)
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

  if (post.authorId !== userId) {
    const actor = await prisma.user.findUnique({
      where: { id: userId },
      select: { firstName: true, lastName: true },
    });
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

  return mapComment(comment);
}

export async function getComments(
  postId: string,
  cursor?: string,
  limit: number = 10,
  userId?: string
) {
  const comments = await prisma.comment.findMany({
    where: { postId, parentId: null }, // top-level only
    select: getCommentSelect(userId),
    orderBy: { createdAt: "asc" },
    take: limit + 1,
    ...(cursor && { cursor: { id: cursor }, skip: 1 }),
  });

  const hasMore = comments.length > limit;
  const items = hasMore ? comments.slice(0, limit) : comments;

  const mappedItems = items.map((c: any) => {
    return {
      ...mapComment(c),
      replies: [], // No replies initially to match "View replies" request
    };
  });

  return {
    comments: mappedItems,
    nextCursor: hasMore ? mappedItems[mappedItems.length - 1].id : null,
    hasMore,
  };
}

export async function getReplies(
  commentId: string,
  cursor?: string,
  limit: number = 5,
  userId?: string
) {
  const replies = await prisma.comment.findMany({
    where: { parentId: commentId },
    orderBy: { createdAt: "asc" },
    select: getCommentSelect(userId), // Use CommentSelect for recursive counts
    take: limit + 1,
    ...(cursor && { cursor: { id: cursor }, skip: 1 }),
  });

  const hasMore = replies.length > limit;
  const items = hasMore ? replies.slice(0, limit) : replies;
  const mappedItems = items.map(mapComment);

  return {
    replies: mappedItems,
    nextCursor: hasMore ? mappedItems[mappedItems.length - 1].id : null,
    hasMore,
  };
}

export async function updateComment(commentId: string, userId: string, content: string) {
  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    select: { authorId: true },
  });

  if (!comment) throw new AppError("Comment not found.", 404, "NOT_FOUND");
  if (comment.authorId !== userId) {
    throw new AppError("You can only edit your own comments.", 403, "FORBIDDEN");
  }

  const updated = await prisma.comment.update({
    where: { id: commentId },
    data: { content },
    select: getCommentSelect(userId),
  });

  return mapComment(updated);
}

export async function deleteComment(commentId: string, userId: string) {
  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    select: { authorId: true, postId: true, parentId: true },
  });

  if (!comment) throw new AppError("Comment not found.", 404, "NOT_FOUND");
  if (comment.authorId !== userId) {
    throw new AppError("You can only delete your own comments.", 403, "FORBIDDEN");
  }

  if (comment.parentId) {
    // It's a reply — just delete it, no post counter change
    await prisma.comment.delete({ where: { id: commentId } });
  } else {
    // Top-level comment — cascade deletes replies via FK, and decrement post counter
    await prisma.$transaction([
      prisma.comment.delete({ where: { id: commentId } }),
      prisma.post.update({
        where: { id: comment.postId },
        data: { commentCount: { decrement: 1 } },
      }),
    ]);
  }
}
