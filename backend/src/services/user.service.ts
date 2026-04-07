import { ShortcutKind } from "@prisma/client";
import prisma from "../config/database";
import { AppError } from "../middleware/error.middleware";

const MAX_RECENT_VISITS = 3;
const MAX_SHORTCUTS = 4;

export interface MenuRecentVisit {
  id: string;
  firstName: string;
  lastName: string;
  profilePicture: string | null;
  bio: string | null;
}

export interface MenuShortcut {
  id: string;
  title: string;
  url: string;
  icon: string;
  kind: "profile" | "link";
  profileUserId?: string;
  profilePicture?: string | null;
  subtitle?: string | null;
}

interface CreateShortcutInput {
  title: string;
  url: string;
  icon: string;
  kind: "profile" | "link";
  profileUserId?: string;
  subtitle?: string | null;
}

function ensureOwnUser(requestingUserId: string, targetUserId: string) {
  if (requestingUserId !== targetUserId) {
    throw new AppError("You are not allowed to modify another user's menu.", 403, "FORBIDDEN");
  }
}

function mapRecentVisit(visit: {
  visitedProfile: {
    id: string;
    firstName: string;
    lastName: string;
    profilePicture: string | null;
    bio: string | null;
  };
}): MenuRecentVisit {
  return {
    id: visit.visitedProfile.id,
    firstName: visit.visitedProfile.firstName,
    lastName: visit.visitedProfile.lastName,
    profilePicture: visit.visitedProfile.profilePicture,
    bio: visit.visitedProfile.bio,
  };
}

function mapShortcut(shortcut: {
  id: string;
  title: string;
  url: string;
  icon: string;
  kind: ShortcutKind;
  subtitle: string | null;
  profileUserId: string | null;
  profileUser: {
    id: string;
    profilePicture: string | null;
    bio: string | null;
  } | null;
}): MenuShortcut {
  return {
    id: shortcut.id,
    title: shortcut.title,
    url: shortcut.url,
    icon: shortcut.icon,
    kind: shortcut.kind === ShortcutKind.PROFILE ? "profile" : "link",
    profileUserId: shortcut.profileUserId ?? undefined,
    profilePicture: shortcut.profileUser?.profilePicture ?? null,
    subtitle: shortcut.profileUser?.bio ?? shortcut.subtitle ?? null,
  };
}

async function loadRecentVisits(userId: string): Promise<MenuRecentVisit[]> {
  const recentVisits = await prisma.recentProfileVisit.findMany({
    where: { userId },
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
    take: MAX_RECENT_VISITS,
    include: {
      visitedProfile: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          profilePicture: true,
          bio: true,
        },
      },
    },
  });

  return recentVisits.map(mapRecentVisit);
}

async function loadShortcuts(userId: string): Promise<MenuShortcut[]> {
  const shortcuts = await prisma.userShortcut.findMany({
    where: { userId },
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
    take: MAX_SHORTCUTS,
    include: {
      profileUser: {
        select: {
          id: true,
          profilePicture: true,
          bio: true,
        },
      },
    },
  });

  return shortcuts.map(mapShortcut);
}

async function trimRecentVisits(userId: string) {
  const overflow = await prisma.recentProfileVisit.findMany({
    where: { userId },
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
    skip: MAX_RECENT_VISITS,
    select: { id: true },
  });

  if (overflow.length > 0) {
    await prisma.recentProfileVisit.deleteMany({
      where: { id: { in: overflow.map((item) => item.id) } },
    });
  }
}

async function trimShortcuts(userId: string) {
  const overflow = await prisma.userShortcut.findMany({
    where: { userId },
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
    skip: MAX_SHORTCUTS,
    include: {
      profileUser: {
        select: {
          id: true,
          profilePicture: true,
          bio: true,
        },
      },
    },
  });

  if (overflow.length > 0) {
    await prisma.userShortcut.deleteMany({
      where: { id: { in: overflow.map((item) => item.id) } },
    });
  }

  return overflow.length > 0 ? mapShortcut(overflow[0]) : null;
}

export async function getMenuPreferences(requestingUserId: string, targetUserId: string) {
  ensureOwnUser(requestingUserId, targetUserId);

  const [recentVisits, shortcuts] = await Promise.all([
    loadRecentVisits(targetUserId),
    loadShortcuts(targetUserId),
  ]);

  return { recentVisits, shortcuts };
}

export async function recordRecentVisitForUser(
  requestingUserId: string,
  targetUserId: string,
  visitedProfileId: string
) {
  ensureOwnUser(requestingUserId, targetUserId);

  if (!visitedProfileId) {
    throw new AppError("profileId is required.", 400, "VALIDATION_ERROR");
  }

  if (visitedProfileId === targetUserId) {
    return getMenuPreferences(requestingUserId, targetUserId);
  }

  const visitedProfile = await prisma.user.findUnique({
    where: { id: visitedProfileId },
    select: { id: true },
  });

  if (!visitedProfile) {
    throw new AppError("Visited profile not found.", 404, "NOT_FOUND");
  }

  await prisma.recentProfileVisit.upsert({
    where: {
      userId_visitedProfileId: {
        userId: targetUserId,
        visitedProfileId,
      },
    },
    create: {
      userId: targetUserId,
      visitedProfileId,
    },
    update: {
      updatedAt: new Date(),
    },
  });

  await trimRecentVisits(targetUserId);
  return getMenuPreferences(requestingUserId, targetUserId);
}

export async function addShortcutForUser(
  requestingUserId: string,
  targetUserId: string,
  input: CreateShortcutInput
) {
  ensureOwnUser(requestingUserId, targetUserId);

  if (!input.title?.trim() || !input.url?.trim() || !input.icon?.trim()) {
    throw new AppError("title, url, and icon are required.", 400, "VALIDATION_ERROR");
  }

  if (input.kind !== "profile" && input.kind !== "link") {
    throw new AppError("Invalid shortcut kind.", 400, "VALIDATION_ERROR");
  }

  if (input.kind === "profile" && !input.profileUserId) {
    throw new AppError("profileUserId is required for profile shortcuts.", 400, "VALIDATION_ERROR");
  }

  if (input.kind === "profile" && input.profileUserId) {
    const profileUser = await prisma.user.findUnique({
      where: { id: input.profileUserId },
      select: { id: true },
    });

    if (!profileUser) {
      throw new AppError("Shortcut profile not found.", 404, "NOT_FOUND");
    }
  }

  const existingShortcut = input.kind === "profile"
    ? await prisma.userShortcut.findFirst({
        where: {
          userId: targetUserId,
          kind: ShortcutKind.PROFILE,
          profileUserId: input.profileUserId,
        },
      })
    : await prisma.userShortcut.findFirst({
        where: {
          userId: targetUserId,
          kind: ShortcutKind.LINK,
          url: input.url.trim(),
        },
      });

  if (existingShortcut) {
    await prisma.userShortcut.update({
      where: { id: existingShortcut.id },
      data: {
        title: input.title.trim(),
        url: input.url.trim(),
        icon: input.icon.trim(),
        subtitle: input.subtitle?.trim() || null,
        profileUserId: input.kind === "profile" ? input.profileUserId ?? null : null,
      },
    });
  } else {
    await prisma.userShortcut.create({
      data: {
        userId: targetUserId,
        kind: input.kind === "profile" ? ShortcutKind.PROFILE : ShortcutKind.LINK,
        title: input.title.trim(),
        url: input.url.trim(),
        icon: input.icon.trim(),
        subtitle: input.subtitle?.trim() || null,
        profileUserId: input.kind === "profile" ? input.profileUserId ?? null : null,
      },
    });
  }

  const droppedShortcut = await trimShortcuts(targetUserId);
  const { shortcuts } = await getMenuPreferences(requestingUserId, targetUserId);
  return { shortcuts, droppedShortcut };
}

export async function removeShortcutForUser(
  requestingUserId: string,
  targetUserId: string,
  shortcutId: string
) {
  ensureOwnUser(requestingUserId, targetUserId);

  const shortcut = await prisma.userShortcut.findFirst({
    where: {
      id: shortcutId,
      userId: targetUserId,
    },
  });

  if (!shortcut) {
    throw new AppError("Shortcut not found.", 404, "NOT_FOUND");
  }

  await prisma.userShortcut.delete({
    where: { id: shortcutId },
  });

  const shortcuts = await loadShortcuts(targetUserId);
  return { shortcuts };
}

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
                },
              },
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
