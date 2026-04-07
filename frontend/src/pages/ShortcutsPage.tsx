import { useEffect, useRef, useState, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import GlobalMenu from "../components/GlobalMenu";
import { useCreatePostAction } from "../hooks/useCreatePostAction";
import { useAppToast } from "../contexts/AppToastContext";
import { useAuth } from "../contexts/AuthContext";
import {
  addShortcutForUser,
  getMenuPreferences,
  removeShortcutForUser,
} from "../api/menu";
import { searchAll, SearchUser } from "../api/search";
import {
  ShortcutItem,
  addShortcut,
  getShortcuts,
  hydrateMenuStorage,
  removeShortcut,
  setShortcuts as setStoredShortcuts,
} from "../utils/globalMenuStorage";
import { FiPlus, FiX, FiLink, FiSearch, FiBell } from "react-icons/fi";

export default function ShortcutsPage() {
  const navigate = useNavigate();
  const openCreatePost = useCreatePostAction();
  const { user } = useAuth();
  const { showToast } = useAppToast();
  const [shortcuts, setShortcuts] = useState<ShortcutItem[]>(() => getShortcuts());
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showAddCustom, setShowAddCustom] = useState(false);
  const [customTitle, setCustomTitle] = useState("");
  const [customUrl, setCustomUrl] = useState("");
  const [customIcon, setCustomIcon] = useState("🔗");
  const [showGlobalMenu, setShowGlobalMenu] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    setShortcuts(getShortcuts());

    if (!user?.userId) {
      return;
    }

    void getMenuPreferences(user.userId)
      .then((result) => {
        hydrateMenuStorage(result.recentVisits, result.shortcuts);
        setShortcuts(result.shortcuts);
      })
      .catch((err) => {
        console.error("Failed to load menu preferences:", err);
      });
  }, [user?.userId]);

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (!searchQuery.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await searchAll(searchQuery.trim(), "users", 1, 6);
        setSearchResults(results.users);
      } catch (err) {
        console.error("Failed to search people for shortcuts:", err);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [searchQuery]);

  const handleRemove = (id: string) => {
    const optimistic = removeShortcut(id);
    setShortcuts(optimistic);

    if (!user?.userId) {
      return;
    }

    void removeShortcutForUser(user.userId, id)
      .then((result) => {
        setStoredShortcuts(result.shortcuts);
        setShortcuts(result.shortcuts);
      })
      .catch((err) => {
        console.error("Failed to remove shortcut:", err);
      });
  };

  const handleAddCustom = (e: FormEvent) => {
    e.preventDefault();
    if (!customTitle.trim() || !customUrl.trim()) return;

    const newShortcut: ShortcutItem = {
      id: Date.now().toString(),
      title: customTitle.trim(),
      url: customUrl.trim(),
      icon: customIcon || "🔗",
      kind: "link",
    };

    const result = addShortcut(newShortcut);
    setShortcuts(result.shortcuts);
    if (result.droppedShortcut) {
      showToast("Only 4 shortcuts are allowed. Removed the oldest shortcut.", "info");
    }

    setCustomTitle("");
    setCustomUrl("");
    setCustomIcon("🔗");
    setShowAddCustom(false);

    if (!user?.userId) {
      return;
    }

    void addShortcutForUser(user.userId, newShortcut)
      .then((serverResult) => {
        setStoredShortcuts(serverResult.shortcuts);
        setShortcuts(serverResult.shortcuts);
        if (serverResult.droppedShortcut && !result.droppedShortcut) {
          showToast("Only 4 shortcuts are allowed. Removed the oldest shortcut.", "info");
        }
      })
      .catch((err) => {
        console.error("Failed to persist custom shortcut:", err);
      });
  };

  const addPersonShortcut = (person: SearchUser) => {
    const result = addShortcut({
      id: `profile-${person.id}`,
      title: `${person.firstName} ${person.lastName}`,
      url: `/profile/${person.id}`,
      icon: "👤",
      kind: "profile",
      profileUserId: person.id,
      profilePicture: person.profilePicture,
      subtitle: person.bio,
    });

    setShortcuts(result.shortcuts);
    if (result.droppedShortcut) {
      showToast("Only 4 shortcuts are allowed. Removed the oldest shortcut.", "info");
    }
    setSearchQuery("");
    setSearchResults([]);

    if (!user?.userId) {
      return;
    }

    void addShortcutForUser(user.userId, {
      title: `${person.firstName} ${person.lastName}`,
      url: `/profile/${person.id}`,
      icon: "👤",
      kind: "profile",
      profileUserId: person.id,
      subtitle: person.bio,
    })
      .then((serverResult) => {
        setStoredShortcuts(serverResult.shortcuts);
        setShortcuts(serverResult.shortcuts);
        if (serverResult.droppedShortcut && !result.droppedShortcut) {
          showToast("Only 4 shortcuts are allowed. Removed the oldest shortcut.", "info");
        }
      })
      .catch((err) => {
        console.error("Failed to persist profile shortcut:", err);
      });
  };

  const openShortcut = (shortcut: ShortcutItem) => {
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
    <div className="shortcuts-page">
      <header className="feed-header">
        <h1 className="logo logo-small" onClick={() => navigate("/feed")} style={{ cursor: "pointer" }}>Facebook</h1>
        <div className="feed-header-right">
          <button className="header-icon-btn" onClick={() => navigate("/search")}><FiSearch size={20} /></button>
          <button className="header-icon-btn" onClick={() => navigate("/notifications")} aria-label="Notifications">
            <FiBell size={20} />
          </button>
        </div>
      </header>

      <section className="shortcuts-section">
        <h3 className="shortcuts-section-title">Search Person</h3>
        <div className="shortcuts-search-wrap">
          <FiSearch size={18} className="shortcuts-search-icon" />
          <input
            type="text"
            className="shortcuts-search-input"
            placeholder="Search people to add..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            id="shortcut-search"
          />
        </div>
        {searchResults.length > 0 && (
          <div className="shortcuts-search-results">
            {searchResults.map((person) => (
              <button
                key={person.id}
                className="shortcuts-search-result-item"
                onClick={() => addPersonShortcut(person)}
              >
                <div className="post-avatar" style={{ width: 36, height: 36 }}>
                  {person.profilePicture ? (
                    <img
                      src={person.profilePicture}
                      alt=""
                      style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover" }}
                    />
                  ) : (
                    <span className="avatar-initials" style={{ fontSize: "0.75rem" }}>
                      {person.firstName[0]}
                      {person.lastName[0]}
                    </span>
                  )}
                </div>
                <div className="search-user-info">
                  <span className="search-user-name">
                    {person.firstName} {person.lastName}
                  </span>
                  {person.bio && (
                    <span className="search-user-bio">
                      {person.bio.slice(0, 60)}
                      {person.bio.length > 60 ? "..." : ""}
                    </span>
                  )}
                </div>
                <FiPlus size={16} className="shortcuts-add-icon" />
              </button>
            ))}
          </div>
        )}
        {isSearching && <p className="shortcuts-empty">Searching...</p>}
        {!isSearching && searchQuery.trim() && searchResults.length === 0 && (
          <p className="shortcuts-empty">No people found.</p>
        )}
      </section>

      <section className="shortcuts-section">
        <div className="shortcuts-section-header">
          <h3 className="shortcuts-section-title">Custom Shortcut</h3>
          {!showAddCustom && (
            <button
              className="shortcuts-add-btn"
              onClick={() => setShowAddCustom(true)}
              id="add-custom-shortcut"
            >
              <FiPlus size={16} />
              <span>Add</span>
            </button>
          )}
        </div>

        {showAddCustom && (
          <form className="shortcuts-add-form" onSubmit={handleAddCustom}>
            <div className="shortcuts-form-row">
              <input
                type="text"
                className="shortcuts-form-input shortcuts-icon-input"
                placeholder="🔗"
                value={customIcon}
                onChange={(e) => setCustomIcon(e.target.value)}
                maxLength={2}
              />
              <input
                type="text"
                className="shortcuts-form-input"
                placeholder="Title"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                required
                id="custom-shortcut-title"
              />
            </div>
            <div className="shortcuts-form-row">
              <FiLink size={16} className="shortcuts-url-icon" />
              <input
                type="url"
                className="shortcuts-form-input"
                placeholder="https://example.com"
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
                required
                id="custom-shortcut-url"
              />
            </div>
            <div className="shortcuts-form-actions">
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setShowAddCustom(false)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary btn-sm"
                disabled={!customTitle.trim() || !customUrl.trim()}
              >
                Add Shortcut
              </button>
            </div>
          </form>
        )}
      </section>

      <section className="shortcuts-section">
        <h3 className="shortcuts-section-title">
          Your Shortcuts ({shortcuts.length})
        </h3>
        {shortcuts.length === 0 ? (
          <p className="shortcuts-empty">No shortcuts yet. Add one above!</p>
        ) : (
          <div className="shortcuts-list">
            {shortcuts.map((s) => (
              <div
                key={s.id}
                className="shortcuts-list-item shortcuts-list-item-clickable"
                onClick={() => openShortcut(s)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    openShortcut(s);
                  }
                }}
                role="button"
                tabIndex={0}
              >
                <div className="shortcut-icon">
                  {s.kind === "profile" && s.profilePicture ? (
                    <img src={s.profilePicture} alt="" className="shortcut-avatar-image" />
                  ) : (
                    s.icon
                  )}
                </div>
                <div className="shortcuts-list-item-info">
                  <span className="shortcuts-list-item-title">{s.title}</span>
                  <span className="shortcuts-list-item-url">{s.subtitle || s.url}</span>
                </div>
                <button
                  type="button"
                  className="shortcuts-remove-btn"
                  onClick={(event) => {
                    event.stopPropagation();
                    handleRemove(s.id);
                  }}
                  aria-label={`Remove ${s.title}`}
                >
                  <FiX size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

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
