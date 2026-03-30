import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "../contexts/AuthContext";
import PostCard from "../components/PostCard";
import CreatePostModal from "../components/CreatePostModal";
import GlobalMenu from "../components/GlobalMenu";
import { Post } from "../api/posts";
import { getApiErrorMessage } from "../api/error";
import { getUnreadCount } from "../api/notifications";
import apiClient from "../api/client";
import { FiSearch, FiBell, FiLock, FiUnlock } from "react-icons/fi";
import { useNavigate } from "react-router-dom";

export default function FeedPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const seedRef = useRef(Math.random().toString(36).substring(7));
  const observerTarget = useRef<HTMLDivElement | null>(null);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showGlobalMenu, setShowGlobalMenu] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Fetch posts on mount or pagination
  const fetchPosts = useCallback(async (pageNum: number, isInitial = false) => {
    if (isInitial) setIsLoading(true);
    else setIsFetchingMore(true);

    try {
      if (isInitial) setLoadError(null);
      const res = await apiClient.get(`/feed?page=${pageNum}&limit=5&seed=${seedRef.current}`);
      const newPosts = res.data.posts || [];
      
      setPosts(prev => isInitial ? newPosts : [...prev, ...newPosts]);
      setHasMore(res.data.hasMore);
    } catch (error) {
      console.error("Failed to fetch posts:", error);
      if (isInitial) {
        setLoadError(getApiErrorMessage(error, "Failed to load your feed. Please try again."));
      }
    } finally {
      if (isInitial) setIsLoading(false);
      else setIsFetchingMore(false);
    }
  }, []);

  useEffect(() => {
    fetchPosts(1, true);
    getUnreadCount().then(res => setUnreadCount(typeof res === 'number' ? res : (res as any).unreadCount || 0)).catch(console.error);
  }, [fetchPosts]);

  // Infinite Scroll Observer hook
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !isLoading && !isFetchingMore) {
          setPage(prev => {
            const next = prev + 1;
            fetchPosts(next, false);
            return next;
          });
        }
      },
      { rootMargin: "100px", threshold: 1.0 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [hasMore, isLoading, isFetchingMore, fetchPosts]);

  // Add new post to the top of the feed
  const handlePostCreated = (newPost: Post) => {
    setPosts((prev) => [newPost, ...prev]);
  };

  const initials = user ? `${user.firstName[0]}${user.lastName[0]}` : "?";

  return (
    <div className="feed-page">
      {/* ── Top Bar ── */}
      <header className="feed-header">
        <h1 className="logo logo-small" id="feed-logo" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} style={{ cursor: "pointer" }}>Facebook</h1>
        <div className="feed-header-right">
          <button className="header-icon-btn" aria-label="Search" id="feed-search-btn" onClick={() => navigate("/search")}>
            <FiSearch size={20} />
          </button>
          <button className="header-icon-btn" aria-label="Notifications" style={{ position: "relative" }} id="feed-notif-btn" onClick={() => navigate("/notifications")}>
            <FiBell size={20} />
            {unreadCount > 0 && (
              <span style={{ position: "absolute", top: -4, right: -4, background: "var(--color-error)", color: "#fff", borderRadius: "50%", padding: "2px 6px", fontSize: "0.75rem", fontWeight: "bold" }}>
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </button>
          <div
            className="header-avatar"
            id="feed-avatar"
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

      {/* ── Feed Content ── */}
      <main className={`feed-content ${isLocked ? "feed-locked" : ""}`}>
        {isLoading && posts.length === 0 ? (
          <div className="feed-skeletons">
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton-card card">
                <div className="skeleton-line skeleton-short" />
                <div className="skeleton-line" />
                <div className="skeleton-line" />
                <div className="skeleton-line skeleton-medium" />
              </div>
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="feed-empty card">
            <p>{loadError || "No posts yet. Create your first post!"}</p>
          </div>
        ) : (
          <div className="feed-list">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
            
            {hasMore && (
              <div ref={observerTarget} className="feed-loading-more" style={{ height: "40px", display: "flex", justifyContent: "center", alignItems: "center" }}>
                {isFetchingMore && <span style={{ color: "var(--text-secondary)" }}>Loading more...</span>}
              </div>
            )}
          </div>
        )}
      </main>

      {/* ── Lock Overlay (blocks clicks, allows scrolling & viewing) ── */}
      {isLocked && <div className="lock-overlay" />}

      {/* ── FAB — Custom "F" button ── */}
      <button
        className="fab fab-f"
        onClick={() => setShowGlobalMenu(true)}
        aria-label="Open menu"
        id="global-menu-fab"
      >
        <span className="fab-f-letter">F</span>
      </button>

      {/* ── Lock Button ── */}
      <button
        className={`lock-btn ${isLocked ? "lock-btn-active" : ""}`}
        onClick={() => setIsLocked(!isLocked)}
        aria-label={isLocked ? "Unlock" : "Lock"}
        id="lock-toggle-btn"
      >
        {isLocked ? <FiLock size={18} /> : <FiUnlock size={18} />}
      </button>

      {/* ── Global Menu ── */}
      <GlobalMenu
        isOpen={showGlobalMenu}
        onClose={() => setShowGlobalMenu(false)}
        onCreatePost={() => setShowCreateModal(true)}
      />

      {/* ── Create Post Modal ── */}
      <CreatePostModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onPostCreated={handlePostCreated}
      />
    </div>
  );
}
