import prisma from "../config/database";

export async function createNotification(
  userId: string,
  actorId: string,
  type: string,
  entityId: string,
  message: string
) {
  // Don't notify yourself
  if (userId === actorId) return null;

  return prisma.notification.create({
    data: {
      userId,
      actorId,
      type,
      entityId,
      message,
    },
  });
}

export async function getNotifications(
  userId: string,
  page: number = 1,
  limit: number = 20
) {
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: {
        actor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profilePicture: true,
          },
        },
      },
    }),
    prisma.notification.count({ where: { userId } }),
  ]);

  return { notifications: items, total, hasMore: skip + limit < total };
}

export async function markAsRead(notificationId: string, userId: string) {
  return prisma.notification.updateMany({
    where: { id: notificationId, userId },
    data: { isRead: true },
  });
}

export async function markAllAsRead(userId: string) {
  return prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true },
  });
}

export async function getUnreadCount(userId: string) {
  return prisma.notification.count({
    where: { userId, isRead: false },
  });
}
