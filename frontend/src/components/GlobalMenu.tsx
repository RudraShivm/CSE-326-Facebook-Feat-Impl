import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiX,
  FiUser,
  FiHome,
  FiBookmark,
  FiSettings,
  FiEdit,
  FiUserPlus,
  FiLogOut,
  FiBell,
} from "react-icons/fi";
import { useAuth } from "../contexts/AuthContext";
import { getMenuPreferences } from "../api/menu";
import {
  RecentVisitProfile,
  ShortcutItem,
  getRecentVisits,
  getShortcuts,
  hydrateMenuStorage,
} from "../utils/globalMenuStorage";

interface GlobalMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onCreatePost: () => void;
}

export default function GlobalMenu({ isOpen, onClose, onCreatePost }: GlobalMenuProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [recentVisits, setRecentVisits] = useState<RecentVisitProfile[]>([]);
  const [shortcuts, setShortcuts] = useState<ShortcutItem[]>([]);

  const handleAddAccount = () => {
    logout();
    onClose();
    navigate("/register");
  };

  const handleSignOut = () => {
    logout();
    onClose();
    navigate("/login");
  };

  // Lock body scroll when menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      const cachedRecentVisits = getRecentVisits();
      const cachedShortcuts = getShortcuts();
      setRecentVisits(cachedRecentVisits);
      setShortcuts(cachedShortcuts);

      if (user?.userId) {
        void getMenuPreferences(user.userId)
          .then((result) => {
            hydrateMenuStorage(result.recentVisits, result.shortcuts);
            setRecentVisits(result.recentVisits);
            setShortcuts(result.shortcuts);
          })
          .catch((err) => {
            console.error("Failed to load menu preferences:", err);
          });
      }
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen, user?.userId]);

  if (!isOpen) return null;

  const openShortcut = (shortcut: ShortcutItem) => {
    onClose();

    if (shortcut.kind === "profile" && shortcut.profileUserId) {
      navigate(`/profile/${shortcut.profileUserId}`);
      return;
    }

    if (shortcut.url.startsWith("/")) {
      navigate(shortcut.url);
      return;
    }

    window.open(shortcut.url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="global-menu-overlay" onClick={onClose}>
      <div className="global-menu" onClick={(e) => e.stopPropagation()}>
        {/* ── Menu Title ── */}
        <div className="global-menu-title-bar">
          <h2 className="global-menu-title">Global Menu</h2>
          <button className="menu-close-btn" onClick={onClose} aria-label="Close menu">
            <FiX size={22} />
          </button>
        </div>

        {/* ── Scrollable Content ── */}
        <div className="global-menu-body">
          {/* Recent Visits */}
          {recentVisits.length > 0 && (
            <section className="menu-section">
              <h3 className="menu-section-title">Recent Visits</h3>
              <div className="menu-recent-list">
                {recentVisits.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className="search-user-card menu-recent-profile"
                    onClick={() => {
                      onClose();
                      navigate(`/profile/${item.id}`);
                    }}
                  >
                    <div className="post-avatar" style={{ width: 40, height: 40 }}>
                      {item.profilePicture ? (
                        <img
                          src={item.profilePicture}
                          alt=""
                          style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover" }}
                        />
                      ) : (
                        <span className="avatar-initials" style={{ fontSize: "0.8rem" }}>
                          {item.firstName[0]}
                          {item.lastName[0]}
                        </span>
                      )}
                    </div>
                    <div className="search-user-info">
                      <span className="search-user-name">
                        {item.firstName} {item.lastName}
                      </span>
                      {item.bio && (
                        <span className="search-user-bio">
                          {item.bio.slice(0, 60)}
                          {item.bio.length > 60 ? "..." : ""}
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Create */}
          <section className="menu-section">
            <h3 className="menu-section-title">Create</h3>
            <button
              className="menu-item"
              onClick={() => {
                onCreatePost();
                onClose();
              }}
              id="menu-create-post"
            >
              <FiEdit size={20} />
              <span>Post on Feed</span>
            </button>
            <button className="menu-item" id="menu-create-group-post">
              <FiEdit size={20} />
              <span>Post in a group</span>
            </button>
          </section>

          {/* Go to + Your Shortcuts (side by side on wider screens) */}
          <div className="menu-columns">
            <section className="menu-section">
              <h3 className="menu-section-title">Go to</h3>
              <button
                className="menu-goto-item"
                onClick={() => {
                  if (user) {
                    onClose();
                    navigate(`/profile/${user.userId}`);
                  }
                }}
              >
                <FiUser size={20} />
                <span>Profile</span>
              </button>
              <button
                className="menu-goto-item"
                onClick={() => {
                  onClose();
                  navigate("/feed");
                }}
              >
                <FiHome size={20} />
                <span>Feed</span>
              </button>
              <button
                className="menu-goto-item"
                onClick={() => {
                  onClose();
                  navigate("/notifications");
                }}
              >
                <FiBell size={20} />
                <span>Notifications</span>
              </button>
              <button
                className="menu-goto-item"
                onClick={() => {
                  onClose();
                  navigate("/saved");
                }}
              >
                <FiBookmark size={20} />
                <span>Saved</span>
              </button>
            </section>

            <section className="menu-section">
              <button
                className="menu-section-title menu-section-title-link"
                onClick={() => {
                  onClose();
                  navigate("/shortcuts");
                }}
                id="menu-shortcuts-link"
              >
                Your Shortcuts →
              </button>
              {shortcuts.length === 0 ? (
                <p className="menu-empty-note">No shortcuts yet.</p>
              ) : (
                shortcuts.map((shortcut) => (
                  <button
                    key={shortcut.id}
                    type="button"
                    className="menu-shortcut-item menu-shortcut-item-button"
                    onClick={() => openShortcut(shortcut)}
                  >
                    <div className="shortcut-icon">
                      {shortcut.kind === "profile" && shortcut.profilePicture ? (
                        <img src={shortcut.profilePicture} alt="" className="shortcut-avatar-image" />
                      ) : (
                        shortcut.icon
                      )}
                    </div>
                    <span>{shortcut.title}</span>
                  </button>
                ))
              )}
            </section>
          </div>

          {/* Settings */}
          <section className="menu-section">
            <h3 className="menu-section-title">Settings</h3>
            <button
              className="menu-item"
              onClick={() => {
                onClose();
                navigate("/settings/profile");
              }}
            >
              <FiSettings size={20} />
              <span>Profile Settings</span>
            </button>
            <button
              className="menu-item"
              onClick={() => {
                onClose();
                navigate("/settings/privacy");
              }}
            >
              <FiSettings size={20} />
              <span>Privacy Settings</span>
            </button>
            <button className="menu-item">
              <FiSettings size={20} />
              <span>Notification Settings</span>
            </button>
            <button className="menu-item">
              <FiSettings size={20} />
              <span>Group Settings</span>
            </button>
          </section>

          {/* Account */}
          <section className="menu-section">
            <h3 className="menu-section-title">Account</h3>
            <button className="menu-item" onClick={handleAddAccount} id="menu-add-account">
              <FiUserPlus size={20} />
              <span>Add Account</span>
            </button>
            <button className="menu-item menu-item-danger" onClick={handleSignOut} id="menu-sign-out">
              <FiLogOut size={20} />
              <span>Sign Out</span>
            </button>
          </section>


        </div>
      </div>
    </div>
  );
}
