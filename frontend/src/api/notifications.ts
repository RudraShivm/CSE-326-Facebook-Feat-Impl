import apiClient from "./client";

export interface NotificationItem {
  id: string;
  type: string;
  message: string;
  entityId: string;
  isRead: boolean;
  createdAt: string;
  actor: {
    id: string;
    firstName: string;
    lastName: string;
    profilePicture: string | null;
  };
}

export interface NotificationsResponse {
  notifications: NotificationItem[];
  total: number;
  hasMore: boolean;
}

export async function getNotifications(page: number = 1, limit: number = 20): Promise<NotificationsResponse> {
  const res = await apiClient.get(`/notifications?page=${page}&limit=${limit}`);
  return res.data;
}

export async function markAsRead(id: string) {
  return apiClient.put(`/notifications/${id}/read`);
}

export async function markAllAsRead(): Promise<void> {
  await apiClient.put("/notifications/read-all");
}

export async function getUnreadCount(): Promise<number> {
  const res = await apiClient.get("/notifications/unread-count");
  return res.data?.count ?? 0;
}
