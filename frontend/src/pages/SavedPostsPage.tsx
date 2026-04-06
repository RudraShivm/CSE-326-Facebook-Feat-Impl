import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { getApiErrorMessage } from "../api/error";
import { getSavedPosts } from "../api/users";
import { Post } from "../api/posts";
import PostCard from "../components/PostCard";
import GlobalMenu from "../components/GlobalMenu";
import { useCreatePostAction } from "../hooks/useCreatePostAction";
import { FiSearch, FiBell, FiBookmark } from "react-icons/fi";

export default function SavedPostsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const openCreatePost = useCreatePostAction();
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Global Menu state
  const [showGlobalMenu, setShowGlobalMenu] = useState(false);

  const fetchSaved = useCallback(async () => {
    if (!user) return;
    try {
      setIsLoading(true);
      setLoadError(null);
      const data = await getSavedPosts(user.userId);
      // The returned items contain post data; map them with isSaved=true
      const mappedPosts = (data.items || []).map((item: any) => ({
        ...item,
        isSaved: true,
      }));
      setPosts(mappedPosts);
    } catch (err) {
      console.error("Failed to fetch saved posts:", err);
      setLoadError(getApiErrorMessage(err, "Failed to load your saved posts. Please try again."));
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchSaved();
  }, [fetchSaved]);

  const initials = user ? `${user.firstName[0]}${user.lastName[0]}` : "?";

  return (
    <div className="saved-page">
      {/* ── Header ── */}
      <header className="feed-header">
        <h1 className="logo logo-small" onClick={() => navigate("/feed")} style={{ cursor: "pointer" }}>Facebook</h1>
        <div className="feed-header-right">
          <button className="header-icon-btn" onClick={() => navigate("/search")}><FiSearch size={20} /></button>
          <button className="header-icon-btn" onClick={() => navigate("/notifications")}>
            <FiBell size={20} />
          </button>
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

      {/* ── Content ── */}
      <main className="saved-content">
        <div className="saved-title-row">
          <FiBookmark size={22} />
          <h2 className="saved-page-title">Saved Posts</h2>
        </div>

        {isLoading ? (
          <div className="feed-skeletons">
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton-card card">
                <div className="skeleton-line skeleton-short" />
                <div className="skeleton-line" />
                <div className="skeleton-line skeleton-medium" />
              </div>
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="feed-empty card">
            <p>{loadError || "No saved posts yet. Save posts from the ⋮ menu on any post."}</p>
          </div>
        ) : (
          <div className="feed-list">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        )}
      </main>

      {/* ── FAB — Custom "F" button ── */}
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
        onCreatePost={openCreatePost}
      />
    </div>
  );
}
