import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getPost, Post } from "../api/posts";
import { getApiErrorMessage } from "../api/error";
import PostCard from "../components/PostCard";
import { useAuth } from "../contexts/AuthContext";

export default function SinglePostPage() {
  const { postId } = useParams<{ postId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!postId) return;
    getPost(postId)
      .then((data: Post) => {
        setError(null);
        setPost(data);
      })
      .catch((err: unknown) => {
        console.error("Failed to load post", err);
        setError(getApiErrorMessage(err, "Post not found or unavailable."));
      })
      .finally(() => setLoading(false));
  }, [postId]);

  const initials = user ? `${user.firstName[0]}${user.lastName[0]}` : "?";

  return (
    <div className="feed-page" style={{ paddingBottom: "2rem" }}>
      {/* ── Header ── */}
      <header className="feed-header" style={{ borderBottom: "1px solid var(--border-color)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <h1 className="logo logo-small" onClick={() => navigate("/feed")} style={{ cursor: "pointer", margin: 0 }}>Facebook</h1>
        </div>
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

      {/* ── Content ── */}
      <main className="feed-content" style={{ marginTop: "24px" }}>
        {loading ? (
          <div className="skeleton-card card">
            <div className="skeleton-line skeleton-short" />
            <div className="skeleton-line" />
            <div className="skeleton-line skeleton-medium" />
          </div>
        ) : !post ? (
          <div className="card" style={{ padding: "2rem", textAlign: "center", color: "var(--text-secondary)" }}>
            {error || "Post not found or unavailable."}
          </div>
        ) : (
          <div className="single-post-wrapper">
             {/* Open comments by default for isolated active route view. */}
             <PostCard post={post} initiallyShowComments={true} />
          </div>
        )}
      </main>
    </div>
  );
}
