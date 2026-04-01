import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { getProfile, getUserPosts, UserProfile, updateProfile } from "../api/users";
import { getApiErrorMessage } from "../api/error";
import { uploadMedia } from "../api/storage";
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
  FiCamera,
  FiLoader,
} from "react-icons/fi";

const MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024;

export default function ProfilePage() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { user, updateUserContext } = useAuth();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [postsLoading, setPostsLoading] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [postsError, setPostsError] = useState<string | null>(null);

  // Upload state
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  // Global Menu state
  const [showGlobalMenu, setShowGlobalMenu] = useState(false);

  const fetchProfile = useCallback(async () => {
    if (!userId) return;
    try {
      setIsLoading(true);
      setProfileError(null);
      const data = await getProfile(userId);
      setProfile(data);
    } catch (err) {
      console.error("Failed to fetch profile:", err);
      setProfileError(getApiErrorMessage(err, "Failed to load this profile. Please try again."));
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  const fetchPosts = useCallback(async () => {
    if (!userId) return;
    try {
      setPostsLoading(true);
      setPostsError(null);
      const data = await getUserPosts(userId);
      setPosts(data.posts || []);
    } catch (err) {
      console.error("Failed to fetch user posts:", err);
      setPostsError(getApiErrorMessage(err, "Failed to load this user's posts. Please try again."));
    } finally {
      setPostsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchProfile();
    fetchPosts();
  }, [fetchProfile, fetchPosts]);

  // ── Image upload handlers ──
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > MAX_UPLOAD_SIZE_BYTES) {
      alert("Profile picture must be 10 MB or smaller.");
      if (avatarInputRef.current) avatarInputRef.current.value = "";
      return;
    }
    setIsUploadingAvatar(true);
    try {
      const url = await uploadMedia(file);
      const updated = await updateProfile(user.userId, { profilePicture: url });
      setProfile(updated);
      updateUserContext({ profilePicture: url });
    } catch (err) {
      console.error("Failed to upload profile picture:", err);
      alert(getApiErrorMessage(err, "Failed to upload profile picture. Please try again."));
    } finally {
      setIsUploadingAvatar(false);
      if (avatarInputRef.current) avatarInputRef.current.value = "";
    }
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > MAX_UPLOAD_SIZE_BYTES) {
      alert("Cover photo must be 10 MB or smaller.");
      if (coverInputRef.current) coverInputRef.current.value = "";
      return;
    }
    setIsUploadingCover(true);
    try {
      const url = await uploadMedia(file);
      const updated = await updateProfile(user.userId, { coverPhoto: url });
      setProfile(updated);
    } catch (err) {
      console.error("Failed to upload cover photo:", err);
      alert(getApiErrorMessage(err, "Failed to upload cover photo. Please try again."));
    } finally {
      setIsUploadingCover(false);
      if (coverInputRef.current) coverInputRef.current.value = "";
    }
  };

  if (isLoading) {
    return (
      <div className="profile-page">
        <header className="feed-header">
          <h1 className="logo logo-small" onClick={() => navigate("/feed")} style={{ cursor: "pointer" }}>Facebook</h1>
          <div className="feed-header-right">
            <button className="header-icon-btn" onClick={() => navigate("/search")}><FiSearch size={20} /></button>
            <button className="header-icon-btn" onClick={() => navigate("/notifications")}><FiBell size={20} /></button>
            <div
              className="header-avatar"
              onClick={() => user && navigate(`/profile/${user.userId}`)}
              style={{ cursor: "pointer" }}
            >
              {user?.profilePicture ? (
                <img src={user.profilePicture} alt="Profile" />
              ) : (
                <span className="avatar-initials">{user ? `${user.firstName[0]}${user.lastName[0]}` : "?"}</span>
              )}
            </div>
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
            <div
              className="header-avatar"
              onClick={() => user && navigate(`/profile/${user.userId}`)}
              style={{ cursor: "pointer" }}
            >
              {user?.profilePicture ? (
                <img src={user.profilePicture} alt="Profile" />
              ) : (
                <span className="avatar-initials">{user ? `${user.firstName[0]}${user.lastName[0]}` : "?"}</span>
              )}
            </div>
          </div>
        </header>
        <main className="profile-not-found card">
          <p>{profileError || "User not found."}</p>
        </main>
      </div>
    );
  }

  const fullName = `${profile.firstName} ${profile.lastName}`;
  const profileInitials = `${profile.firstName[0]}${profile.lastName[0]}`;
  const isOwnProfile = user?.userId === profile.id;
  const hasNoInfo = !profile.instagramLink && !profile.linkedinLink && !profile.jobStatus && !profile.relationshipStatus;

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
          <div
            className="header-avatar"
            onClick={() => user && navigate(`/profile/${user.userId}`)}
            style={{ cursor: "pointer" }}
          >
            {user?.profilePicture ? (
              <img src={user.profilePicture} alt="Profile" />
            ) : (
              <span className="avatar-initials">{user ? `${user.firstName[0]}${user.lastName[0]}` : "?"}</span>
            )}
          </div>
        </div>
      </header>

      {/* ── Profile Content ── */}
      <main className="profile-content">
        <input type="file" accept="image/*" ref={avatarInputRef} style={{ display: "none" }} onChange={handleAvatarUpload} />
        <input type="file" accept="image/*" ref={coverInputRef} style={{ display: "none" }} onChange={handleCoverUpload} />

        {/* Cover Photo */}
        <div className="profile-cover">
          {profile.coverPhoto ? (
            <img src={profile.coverPhoto} alt="Cover" className="profile-cover-img" />
          ) : (
            <div className="profile-cover-placeholder">
              {isOwnProfile && (
                <button 
                  className="btn btn-secondary add-cover-btn btn-sm" 
                  onClick={() => coverInputRef.current?.click()}
                  disabled={isUploadingCover}
                >
                  {isUploadingCover ? <FiLoader size={16} className="spin-icon" /> : <FiCamera size={16} />} 
                  {isUploadingCover ? "Uploading..." : "Add Cover Photo"}
                </button>
              )}
            </div>
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
            {!profile.profilePicture && isOwnProfile && (
              <button 
                className="add-avatar-btn" 
                onClick={() => avatarInputRef.current?.click()}
                title="Add Profile Picture"
                disabled={isUploadingAvatar}
              >
                {isUploadingAvatar ? <FiLoader size={16} className="spin-icon" /> : <FiCamera size={20} />}
              </button>
            )}
          </div>
          <h2 className="profile-name">{fullName}</h2>
          {profile.bio && <p className="profile-bio" style={{ whiteSpace: "pre-wrap" }}>{profile.bio}</p>}
        </div>

        {/* Info Card */}
        {hasNoInfo && isOwnProfile ? (
          <div className="profile-info-card card empty-info-card">
            <p className="empty-info-text">You haven't added any profile info yet.</p>
            <button className="btn btn-secondary btn-sm" onClick={() => navigate("/settings/profile")}>
              Add Profile Info
            </button>
          </div>
        ) : !hasNoInfo ? (
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
        ) : null}

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
              <p>{postsError || "No posts yet."}</p>
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
