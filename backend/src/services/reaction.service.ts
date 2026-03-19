import { ReactionType } from "@prisma/client";
import prisma from "../config/database";
import { AppError } from "../middleware/error.middleware";
import { createNotification } from "./notification.service";

export async function togglePostReaction(postId: string, userId: string, type: ReactionType) {
  // Check if post exists
  const post = await prisma.post.findUnique({ where: { id: postId } });
  if (!post) throw new AppError("Post not found.", 404, "NOT_FOUND");

  // Check for existing reaction
  const existing = await prisma.reaction.findUnique({
    where: {
      userId_postId: { userId, postId },
    },
  });

  if (existing) {
    if (existing.type === type) {
      // Same reaction -> toggle off (delete) and decrement count
      await prisma.$transaction([
        prisma.reaction.delete({ where: { id: existing.id } }),
        prisma.post.update({
          where: { id: postId },
          data: { likeCount: { decrement: 1 } },
        }),
      ]);
      return { status: "removed" };
    } else {
      // Different reaction -> switch type (count stays same)
      const updated = await prisma.reaction.update({
        where: { id: existing.id },
        data: { type },
      });
      return { status: "updated", reaction: updated };
    }
  } else {
    // No reaction -> create and increment count
    const [created, updatedPost] = await prisma.$transaction([
      prisma.reaction.create({
        data: { type, userId, postId },
      }),
      prisma.post.update({
        where: { id: postId },
        data: { likeCount: { increment: 1 } },
      }),
    ]);

    if (updatedPost.authorId !== userId) {
      const actor = await prisma.user.findUnique({ where: { id: userId }, select: { firstName: true, lastName: true } });
      if (actor) {
        await createNotification(
          updatedPost.authorId,
          userId,
          "LIKE",
          postId,
          `${actor.firstName} ${actor.lastName} reacted to your post.`
        );
      }
    }

    return { status: "added", reaction: created };
  }
}

export async function toggleCommentReaction(commentId: string, userId: string, type: ReactionType) {
  // Similar logic for comments, but we aren't tracking a denormalized
  // likeCount on comments right now (based on class diagram).
  // If we decide to add comment like counts later, we update it here.

  const comment = await prisma.comment.findUnique({ where: { id: commentId } });
  if (!comment) throw new AppError("Comment not found.", 404, "NOT_FOUND");

  const existing = await prisma.reaction.findUnique({
    where: {
      userId_commentId: { userId, commentId },
    },
  });

  if (existing) {
    if (existing.type === type) {
      await prisma.reaction.delete({ where: { id: existing.id } });
      return { status: "removed" };
    } else {
      const updated = await prisma.reaction.update({
        where: { id: existing.id },
        data: { type },
      });
      return { status: "updated", reaction: updated };
    }
  } else {
    const created = await prisma.reaction.create({
      data: { type, userId, commentId },
    });

    if (comment.authorId !== userId) {
      const actor = await prisma.user.findUnique({ where: { id: userId }, select: { firstName: true, lastName: true } });
      if (actor) {
        // Find the parent post ID to link the notification correctly, or just link the comment
        await createNotification(
          comment.authorId,
          userId,
          "LIKE",
          comment.postId,
          `${actor.firstName} ${actor.lastName} reacted to your comment.`
        );
      }
    }

    return { status: "added", reaction: created };
  }
}

export async function getPostReactions(postId: string) {
  return prisma.reaction.findMany({
    where: { postId },
    include: { user: { select: { id: true, firstName: true, lastName: true } } },
  });
}
