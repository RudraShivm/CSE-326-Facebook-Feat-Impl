import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { getApiErrorMessage } from "../api/error";
import { getNotifications, markAsRead, markAllAsRead, NotificationItem } from "../api/notifications";
import GlobalMenu from "../components/GlobalMenu";
import { FiBell, FiCheckCircle } from "react-icons/fi";

function formatDateGroup(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const dDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());

  if (dDate.getTime() === today.getTime()) return "Today";
  if (dDate.getTime() === yesterday.getTime()) return "Yesterday";
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: d.getFullYear() !== now.getFullYear() ? "numeric" : undefined });
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function NotificationPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [showGlobalMenu, setShowGlobalMenu] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const fetchNotifications = useCallback(async (pageNum: number = 1, append: boolean = false) => {
    if (!user) return;
    setIsLoading(true);
    try {
      if (!append) setLoadError(null);
      const res = await getNotifications(pageNum, 20);
      setNotifications(prev => append ? [...prev, ...res.notifications] : res.notifications);
      setHasMore(res.hasMore);
      setPage(pageNum);
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
      if (!append) {
        setLoadError(getApiErrorMessage(err, "Failed to load notifications. Please try again."));
      } else {
        setStatus({
          type: "error",
          message: getApiErrorMessage(err, "Failed to load more notifications. Please try again."),
        });
      }
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleMarkAllRead = async () => {
    try {
      setStatus(null);
      await markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setStatus({ type: "success", message: "All notifications marked as read." });
    } catch (err) {
      console.error("Failed to mark all read:", err);
      setStatus({
        type: "error",
        message: getApiErrorMessage(err, "Failed to mark all notifications as read."),
      });
    }
  };

  const handleClick = async (n: NotificationItem) => {
    if (!n.isRead) {
      try {
        setStatus(null);
        await markAsRead(n.id);
        setNotifications(prev => prev.map(notif => notif.id === n.id ? { ...notif, isRead: true } : notif));
      } catch (err) {
        console.error("Failed to mark as read:", err);
        setStatus({
          type: "error",
          message: getApiErrorMessage(err, "Failed to mark this notification as read."),
        });
      }
    }
    // Navigate to the relevant post or profile
    if (n.type === "LIKE" || n.type === "COMMENT") {
      navigate(`/post/${n.entityId}`);
    } else if (n.type === "FRIEND_REQUEST" || n.type === "FRIEND_ACCEPT") {
      navigate(`/profile/${n.actor.id}`);
    }
  };

  // Group notifications by date
  const grouped: Record<string, NotificationItem[]> = {};
  notifications.forEach(n => {
    const group = formatDateGroup(n.createdAt);
    if (!grouped[group]) grouped[group] = [];
    grouped[group].push(n);
  });

  const initials = user ? `${user.firstName[0]}${user.lastName[0]}` : "?";
  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="notification-page">
      {/* ── Header ── */}
      <header className="feed-header">
        <h1 className="logo logo-small" onClick={() => navigate("/feed")} style={{ cursor: "pointer" }}>Facebook</h1>
        <div className="feed-header-right">
          <div
            className="header-avatar"
            onClick={() => user && navigate(`/profile/${user.userId}`)}
            style={{ cursor: "pointer" }}
          >
            {user?.profilePicture ? (
              <img src={user.profilePicture} alt="Profile" />
            ) : (
              <span className="avatar-initials">{initials}</span>
            )}
          </div>
        </div>
      </header>

      <main className="notification-content">
        <div className="notification-header-row">
          <h2 className="notification-page-title">
            <FiBell size={22} /> Notifications
          </h2>
          {unreadCount > 0 && (
            <button className="notification-mark-all" onClick={handleMarkAllRead}>
              <FiCheckCircle size={16} /> Mark all as read
            </button>
          )}
        </div>
        {status && (
          <p className={`status-banner status-banner--${status.type}`}>
            {status.message}
          </p>
        )}

        {isLoading && notifications.length === 0 ? (
          <div className="skeleton-card card">
            <div className="skeleton-line" />
            <div className="skeleton-line skeleton-medium" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="notification-empty">
            <FiBell size={48} style={{ opacity: 0.3 }} />
            <p>{loadError || "No notifications yet"}</p>
          </div>
        ) : (
          <div className="notification-groups">
            {Object.entries(grouped).map(([dateLabel, items]) => (
              <div key={dateLabel} className="notification-group">
                <h3 className="notification-date-label">{dateLabel}</h3>
                {items.map(n => (
                  <div
                    key={n.id}
                    className={`notification-item ${n.isRead ? "" : "notification-unread"}`}
                    onClick={() => handleClick(n)}
                  >
                    <div className="notification-avatar">
                      {n.actor.profilePicture ? (
                        <img src={n.actor.profilePicture} alt="" />
                      ) : (
                        <span className="avatar-initials" style={{ fontSize: "0.7rem" }}>
                          {n.actor.firstName[0]}{n.actor.lastName[0]}
                        </span>
                      )}
                    </div>
                    <div className="notification-body">
                      <p className="notification-text">
                        {n.message}
                      </p>
                      <span className="notification-time">{timeAgo(n.createdAt)}</span>
                    </div>
                    {!n.isRead && <div className="notification-dot" />}
                  </div>
                ))}
              </div>
            ))}

            {hasMore && (
              <button
                className="search-see-more"
                onClick={() => fetchNotifications(page + 1, true)}
                disabled={isLoading}
              >
                {isLoading ? "Loading..." : "Load more"}
              </button>
            )}
          </div>
        )}
      </main>

      {/* FAB */}
      <button
        className="fab fab-f"
        onClick={() => setShowGlobalMenu(true)}
        aria-label="Open menu"
        id="global-menu-fab"
      >
        <span className="fab-f-letter">F</span>
      </button>

      <GlobalMenu
        isOpen={showGlobalMenu}
        onClose={() => setShowGlobalMenu(false)}
        onCreatePost={() => {}}
      />
    </div>
  );
}
