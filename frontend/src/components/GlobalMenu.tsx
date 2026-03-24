import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiX,
  FiUser,
  FiUsers,
  FiGrid,
  FiBookmark,
  FiSettings,
  FiEdit,
  FiUserPlus,
  FiLogOut,
} from "react-icons/fi";
import { useAuth } from "../contexts/AuthContext";

interface GlobalMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onCreatePost: () => void;
}

export default function GlobalMenu({ isOpen, onClose, onCreatePost }: GlobalMenuProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Placeholder recent visits (dismissible)
  const [recentVisits, setRecentVisits] = useState([
    "A happy place",
    "Current Students of BUET",
    "BUET CSE Fest 2026",
  ]);

  const dismissRecent = (item: string) => {
    setRecentVisits((prev) => prev.filter((v) => v !== item));
  };

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
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

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
                  <div key={item} className="menu-recent-item">
                    <button
                      className="menu-recent-dismiss"
                      onClick={() => dismissRecent(item)}
                      aria-label={`Dismiss ${item}`}
                    >
                      <FiX size={16} />
                    </button>
                    <span>{item}</span>
                  </div>
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
              <button className="menu-goto-item">
                <FiUsers size={20} />
                <span>Friends</span>
              </button>
              <button className="menu-goto-item">
                <FiGrid size={20} />
                <span>Group</span>
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
              <div className="menu-shortcut-item">
                <div className="shortcut-icon">📚</div>
                <span>ISD Study Group</span>
              </div>
              <div className="menu-shortcut-item">
                <div className="shortcut-icon">🔢</div>
                <span>Chittagong Math Circle - CMC</span>
              </div>
              <div className="menu-shortcut-item">
                <div className="shortcut-icon">🎓</div>
                <span>NexTop-USA</span>
              </div>
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
