import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getProfile, getUserPosts, UserProfile } from "../api/users";
import { Post } from "../api/posts";
import PostCard from "../components/PostCard";
import GlobalMenu from "../components/GlobalMenu";
import {
  FiSearch,
  FiBell,
  FiInstagram,
  FiLinkedin,
  FiBriefcase,
  FiHeart,
} from "react-icons/fi";

export default function ProfilePage() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [postsLoading, setPostsLoading] = useState(true);

  // Global Menu state
  const [showGlobalMenu, setShowGlobalMenu] = useState(false);

  const fetchProfile = useCallback(async () => {
    if (!userId) return;
    try {
      setIsLoading(true);
      const data = await getProfile(userId);
      setProfile(data);
    } catch (err) {
      console.error("Failed to fetch profile:", err);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  const fetchPosts = useCallback(async () => {
    if (!userId) return;
    try {
      setPostsLoading(true);
      const data = await getUserPosts(userId);
      setPosts(data.posts || []);
    } catch (err) {
      console.error("Failed to fetch user posts:", err);
    } finally {
      setPostsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchProfile();
    fetchPosts();
  }, [fetchProfile, fetchPosts]);

  if (isLoading) {
    return (
      <div className="profile-page">
        <header className="feed-header">
          <h1 className="logo logo-small" onClick={() => navigate("/feed")} style={{ cursor: "pointer" }}>Facebook</h1>
          <div className="feed-header-right">
            <button className="header-icon-btn" onClick={() => navigate("/search")}><FiSearch size={20} /></button>
            <button className="header-icon-btn" onClick={() => navigate("/notifications")}><FiBell size={20} /></button>
          </div>
        </header>
        <main className="profile-loading">
          <div className="skeleton-card card">
            <div className="skeleton-line" />
            <div className="skeleton-line skeleton-medium" />
          </div>
        </main>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="profile-page">
        <header className="feed-header">
          <h1 className="logo logo-small" onClick={() => navigate("/feed")} style={{ cursor: "pointer" }}>Facebook</h1>
          <div className="feed-header-right">
            <button className="header-icon-btn" onClick={() => navigate("/search")}><FiSearch size={20} /></button>
            <button className="header-icon-btn" onClick={() => navigate("/notifications")}><FiBell size={20} /></button>
          </div>
        </header>
        <main className="profile-not-found card">
          <p>User not found.</p>
        </main>
      </div>
    );
  }

  const fullName = `${profile.firstName} ${profile.lastName}`;
  const profileInitials = `${profile.firstName[0]}${profile.lastName[0]}`;

  return (
    <div className="profile-page">
      {/* ── Header ── */}
      <header className="feed-header">
        <h1 className="logo logo-small" onClick={() => navigate("/feed")} style={{ cursor: "pointer" }}>Facebook</h1>
        <div className="feed-header-right">
          <button className="header-icon-btn" aria-label="Search" onClick={() => navigate("/search")}><FiSearch size={20} /></button>
          <button className="header-icon-btn" aria-label="Notifications" onClick={() => navigate("/notifications")}>
            <FiBell size={20} />
          </button>
        </div>
      </header>

      {/* ── Profile Content ── */}
      <main className="profile-content">
        {/* Cover Photo */}
        <div className="profile-cover">
          {profile.coverPhoto ? (
            <img src={profile.coverPhoto} alt="Cover" className="profile-cover-img" />
          ) : (
            <div className="profile-cover-placeholder" />
          )}
        </div>

        {/* Avatar */}
        <div className="profile-avatar-section">
          <div className="profile-avatar-large">
            {profile.profilePicture ? (
              <img src={profile.profilePicture} alt={fullName} />
            ) : (
              <span className="avatar-initials avatar-initials-lg">{profileInitials}</span>
            )}
          </div>
          <h2 className="profile-name">{fullName}</h2>
          {profile.bio && <p className="profile-bio" style={{ whiteSpace: "pre-wrap" }}>{profile.bio}</p>}
        </div>

        {/* Info Card */}
        <div className="profile-info-card card">
          {profile.instagramLink && (
            <div className="profile-info-row">
              <FiInstagram size={18} className="profile-info-icon" />
              <a href={`https://${profile.instagramLink}`} target="_blank" rel="noopener noreferrer">
                {profile.instagramLink}
              </a>
            </div>
          )}
          {profile.linkedinLink && (
            <div className="profile-info-row">
              <FiLinkedin size={18} className="profile-info-icon" />
              <a href={`https://${profile.linkedinLink}`} target="_blank" rel="noopener noreferrer">
                {profile.linkedinLink}
              </a>
            </div>
          )}
          {profile.jobStatus && (
            <div className="profile-info-row">
              <FiBriefcase size={18} className="profile-info-icon" />
              <span>{profile.jobStatus}</span>
            </div>
          )}
          {profile.relationshipStatus && (
            <div className="profile-info-row">
              <FiHeart size={18} className="profile-info-icon" />
              <span>{profile.relationshipStatus}</span>
            </div>
          )}
        </div>

        {/* User Posts */}
        <section className="profile-posts-section">
          <h3 className="profile-posts-title">Posts</h3>
          {postsLoading ? (
            <div className="feed-skeletons">
              {[1, 2].map((i) => (
                <div key={i} className="skeleton-card card">
                  <div className="skeleton-line skeleton-short" />
                  <div className="skeleton-line" />
                  <div className="skeleton-line skeleton-medium" />
                </div>
              ))}
            </div>
          ) : posts.length === 0 ? (
            <div className="feed-empty card">
              <p>No posts yet.</p>
            </div>
          ) : (
            <div className="feed-list">
              {posts.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
          )}
        </section>
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
        onCreatePost={() => {}}
      />
    </div>
  );
}
