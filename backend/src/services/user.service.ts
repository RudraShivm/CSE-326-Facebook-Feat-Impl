import prisma from "../config/database";
import { AppError } from "../middleware/error.middleware";

// ── Get User Profile ──────────────────────────────────────
export async function getUserById(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      profilePicture: true,
      coverPhoto: true,
      bio: true,
      jobStatus: true,
      relationshipStatus: true,
      instagramLink: true,
      linkedinLink: true,
      privacyFuturePosts: true,
      privacyFriendRequests: true,
      privacyFriendsList: true,
      createdAt: true,
    },
  });
  if (!user) throw new AppError("User not found.", 404, "NOT_FOUND");
  return user;
}

// ── Validation helpers ────────────────────────────────────
const INSTAGRAM_REGEX = /^(https?:\/\/)?(www\.)?instagram\.com\/[a-zA-Z0-9._]+\/?$/;
const LINKEDIN_REGEX = /^(https?:\/\/)?(www\.)?linkedin\.com\/in\/[a-zA-Z0-9._-]+\/?$/;
const VALID_PRIVACY = ["PUBLIC", "FRIENDS", "PRIVATE"];

// ── Update User Profile ───────────────────────────────────
export async function updateUser(userId: string, data: any) {
  // Validate social links
  if (data.instagramLink && !INSTAGRAM_REGEX.test(data.instagramLink)) {
    throw new AppError("Invalid Instagram URL.", 400, "VALIDATION_ERROR");
  }
  if (data.linkedinLink && !LINKEDIN_REGEX.test(data.linkedinLink)) {
    throw new AppError("Invalid LinkedIn URL.", 400, "VALIDATION_ERROR");
  }
  // Validate privacy fields
  for (const field of ["privacyFuturePosts", "privacyFriendRequests", "privacyFriendsList"]) {
    if (data[field] && !VALID_PRIVACY.includes(data[field])) {
      throw new AppError(`Invalid value for ${field}.`, 400, "VALIDATION_ERROR");
    }
  }

  const allowedFields = [
    "firstName", "lastName", "bio", "profilePicture", "coverPhoto",
    "jobStatus", "relationshipStatus", "instagramLink", "linkedinLink",
    "privacyFuturePosts", "privacyFriendRequests", "privacyFriendsList",
  ];
  const updateData: any = {};
  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      updateData[field] = data[field];
    }
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: updateData,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      profilePicture: true,
      coverPhoto: true,
      bio: true,
      jobStatus: true,
      relationshipStatus: true,
      instagramLink: true,
      linkedinLink: true,
      privacyFuturePosts: true,
      privacyFriendRequests: true,
      privacyFriendsList: true,
      createdAt: true,
    },
  });
  return user;
}

// ── Save Post ─────────────────────────────────────────────
export async function savePost(userId: string, postId: string) {
  // Check if already saved
  const existing = await prisma.savedPost.findUnique({
    where: { userId_postId: { userId, postId } },
  });
  if (existing) throw new AppError("Post already saved.", 409, "CONFLICT");

  return prisma.savedPost.create({
    data: { userId, postId },
  });
}

// ── Unsave Post ───────────────────────────────────────────
export async function unsavePost(userId: string, postId: string) {
  const existing = await prisma.savedPost.findUnique({
    where: { userId_postId: { userId, postId } },
  });
  if (!existing) throw new AppError("Post not saved.", 404, "NOT_FOUND");

  return prisma.savedPost.delete({
    where: { userId_postId: { userId, postId } },
  });
}

// ── Get Saved Posts ───────────────────────────────────────
export async function getSavedPosts(userId: string, cursor?: string, limit: number = 10) {
  const savedPosts = await prisma.savedPost.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    ...(cursor && { cursor: { id: cursor }, skip: 1 }),
    include: {
      post: {
        include: {
          author: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              profilePicture: true,
            },
          },
        },
      },
    },
  });

  const hasMore = savedPosts.length > limit;
  const items = hasMore ? savedPosts.slice(0, limit) : savedPosts;

  return {
    items: items.map((sp) => ({ ...sp.post, isSaved: true })),
    nextCursor: hasMore ? items[items.length - 1].id : null,
    hasMore,
  };
}

// ── Block User ────────────────────────────────────────────
export async function blockUserById(blockerId: string, blockedId: string) {
  if (blockerId === blockedId) throw new AppError("Cannot block yourself.", 400, "BAD_REQUEST");

  const existing = await prisma.blockedUser.findUnique({
    where: { blockerId_blockedId: { blockerId, blockedId } },
  });
  if (existing) throw new AppError("User already blocked.", 409, "CONFLICT");

  return prisma.blockedUser.create({
    data: { blockerId, blockedId },
  });
}

// ── Unblock User ──────────────────────────────────────────
export async function unblockUserById(blockerId: string, blockedId: string) {
  const existing = await prisma.blockedUser.findUnique({
    where: { blockerId_blockedId: { blockerId, blockedId } },
  });
  if (!existing) throw new AppError("User not blocked.", 404, "NOT_FOUND");

  return prisma.blockedUser.delete({
    where: { blockerId_blockedId: { blockerId, blockedId } },
  });
}

// ── Get Blocked Users ─────────────────────────────────────
export async function getBlockedUsers(blockerId: string) {
  return prisma.blockedUser.findMany({
    where: { blockerId },
    include: {
      blocked: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          profilePicture: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}
