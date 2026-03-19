import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import {
  getProfile,
  updateProfile,
  getBlockedUsers,
  blockUser,
  unblockUser,
  UserProfile,
  BlockedUser,
} from "../api/users";
import GlobalMenu from "../components/GlobalMenu";
import { FiSearch, FiBell, FiRefreshCw, FiChevronRight, FiPlus } from "react-icons/fi";

const PRIVACY_OPTIONS = ["PUBLIC", "FRIENDS", "PRIVATE"];
const PRIVACY_LABELS: Record<string, string> = {
  PUBLIC: "Public",
  FRIENDS: "Friends",
  PRIVATE: "Only me",
};

export default function PrivacySettingsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [blockInput, setBlockInput] = useState("");

  // Global Menu state
  const [showGlobalMenu, setShowGlobalMenu] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        setIsLoading(true);
        const [profileData, blocked] = await Promise.all([
          getProfile(user.userId),
          getBlockedUsers(user.userId),
        ]);
        setProfile(profileData);
        setBlockedUsers(blocked);
      } catch (err) {
        console.error("Failed to fetch privacy data:", err);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [user]);

  const handlePrivacyChange = async (field: string, value: string) => {
    if (!user || !profile) return;
    try {
      const updated = await updateProfile(user.userId, { [field]: value });
      setProfile(updated);
    } catch (err) {
      console.error("Failed to update privacy:", err);
    }
  };

  const handleUnblock = async (blockedId: string) => {
    if (!user) return;
    try {
      await unblockUser(user.userId, blockedId);
      setBlockedUsers((prev) => prev.filter((b) => b.blockedId !== blockedId));
    } catch (err) {
      console.error("Failed to unblock user:", err);
    }
  };

  const handleBlock = async () => {
    if (!user || !blockInput.trim()) return;
    try {
      await blockUser(user.userId, blockInput.trim());
      // Refresh blocked users
      const blocked = await getBlockedUsers(user.userId);
      setBlockedUsers(blocked);
      setBlockInput("");
    } catch (err) {
      console.error("Failed to block user:", err);
    }
  };

  const initials = user ? `${user.firstName[0]}${user.lastName[0]}` : "?";

  return (
    <div className="settings-page">
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
      <main className="settings-content">
        <h2 className="settings-page-title">Privacy Settings</h2>

        {isLoading ? (
          <div className="skeleton-card card">
            <div className="skeleton-line" />
            <div className="skeleton-line skeleton-medium" />
          </div>
        ) : (
          <>
            {/* Privacy Checkup Banner */}
            <div className="privacy-checkup-card">
              <div className="privacy-checkup-text">
                <strong>Privacy Checkup</strong>
                <span>Review your important settings</span>
              </div>
              <div className="privacy-checkup-icon">🛡️</div>
            </div>

            {/* Your Activity */}
            <section className="privacy-section">
              <h3 className="privacy-section-title">Your Activity</h3>

              <div className="privacy-row">
                <span>Who can see your future posts?</span>
                <select
                  className="privacy-select"
                  value={profile?.privacyFuturePosts || "PUBLIC"}
                  onChange={(e) => handlePrivacyChange("privacyFuturePosts", e.target.value)}
                >
                  {PRIVACY_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>{PRIVACY_LABELS[opt]}</option>
                  ))}
                </select>
              </div>

              <div className="privacy-row">
                <span>Limit who can see past posts</span>
                <FiChevronRight size={18} />
              </div>
            </section>

            {/* How people find you */}
            <section className="privacy-section">
              <h3 className="privacy-section-title">How people find and contact you</h3>

              <div className="privacy-row">
                <span>Who can send friend requests?</span>
                <select
                  className="privacy-select"
                  value={profile?.privacyFriendRequests || "PUBLIC"}
                  onChange={(e) => handlePrivacyChange("privacyFriendRequests", e.target.value)}
                >
                  {PRIVACY_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>{PRIVACY_LABELS[opt]}</option>
                  ))}
                </select>
              </div>

              <div className="privacy-row">
                <span>Who can see your friends list?</span>
                <select
                  className="privacy-select"
                  value={profile?.privacyFriendsList || "PUBLIC"}
                  onChange={(e) => handlePrivacyChange("privacyFriendsList", e.target.value)}
                >
                  {PRIVACY_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>{PRIVACY_LABELS[opt]}</option>
                  ))}
                </select>
              </div>
            </section>

            {/* Blocked Users */}
            <section className="privacy-section">
              <h3 className="privacy-section-title">Blocked Users</h3>

              {blockedUsers.length > 0 ? (
                <div className="blocked-users-list">
                  {blockedUsers.map((b) => (
                    <div key={b.id} className="blocked-user-item">
                      <div className="blocked-user-avatar">
                        {b.blocked.profilePicture ? (
                          <img src={b.blocked.profilePicture} alt={`${b.blocked.firstName} ${b.blocked.lastName}`} />
                        ) : (
                          <span className="avatar-initials">
                            {b.blocked.firstName[0]}{b.blocked.lastName[0]}
                          </span>
                        )}
                      </div>
                      <span className="blocked-user-name">
                        {b.blocked.firstName} {b.blocked.lastName}
                      </span>
                      <button
                        className="blocked-user-unblock"
                        onClick={() => handleUnblock(b.blockedId)}
                        title="Unblock"
                      >
                        <FiRefreshCw size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="privacy-empty">No blocked users.</p>
              )}

              <div className="block-user-input-row">
                <input
                  className="settings-input"
                  value={blockInput}
                  onChange={(e) => setBlockInput(e.target.value)}
                  placeholder="Enter user ID to block"
                />
                <button className="btn btn-outline" onClick={handleBlock}>
                  <FiPlus size={16} /> Add to Blocked List
                </button>
              </div>
            </section>
          </>
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
        onCreatePost={() => {}}
      />
    </div>
  );
}
