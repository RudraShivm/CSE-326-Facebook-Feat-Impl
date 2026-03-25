import { useState, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import GlobalMenu from "../components/GlobalMenu";
import { FiPlus, FiX, FiLink, FiSearch, FiBell } from "react-icons/fi";

interface Shortcut {
  id: string;
  title: string;
  url: string;
  icon: string;
}

// Placeholder initial shortcuts (matching the ones in GlobalMenu)
const INITIAL_SHORTCUTS: Shortcut[] = [
  { id: "1", title: "ISD Study Group", url: "#", icon: "📚" },
  { id: "2", title: "Chittagong Math Circle - CMC", url: "#", icon: "🔢" },
  { id: "3", title: "NexTop-USA", url: "#", icon: "🎓" },
];

export default function ShortcutsPage() {
  const navigate = useNavigate();
  const [shortcuts, setShortcuts] = useState<Shortcut[]>(INITIAL_SHORTCUTS);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddCustom, setShowAddCustom] = useState(false);
  const [customTitle, setCustomTitle] = useState("");
  const [customUrl, setCustomUrl] = useState("");
  const [customIcon, setCustomIcon] = useState("🔗");

  // Global Menu state
  const [showGlobalMenu, setShowGlobalMenu] = useState(false);

  const handleRemove = (id: string) => {
    setShortcuts((prev) => prev.filter((s) => s.id !== id));
  };

  const handleAddCustom = (e: FormEvent) => {
    e.preventDefault();
    if (!customTitle.trim() || !customUrl.trim()) return;

    const newShortcut: Shortcut = {
      id: Date.now().toString(),
      title: customTitle.trim(),
      url: customUrl.trim(),
      icon: customIcon || "🔗",
    };

    setShortcuts((prev) => [...prev, newShortcut]);
    setCustomTitle("");
    setCustomUrl("");
    setCustomIcon("🔗");
    setShowAddCustom(false);
  };

  // Placeholder search results (people)
  const searchResults = searchQuery.trim()
    ? [
        { name: "Ahmad Reza", id: "p1" },
        { name: "Farhan Ahmed", id: "p2" },
        { name: "Nusrat Jahan", id: "p3" },
      ].filter((p) =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  const addPersonShortcut = (name: string) => {
    const newShortcut: Shortcut = {
      id: Date.now().toString(),
      title: name,
      url: "#",
      icon: "👤",
    };
    setShortcuts((prev) => [...prev, newShortcut]);
    setSearchQuery("");
  };

  return (
    <div className="shortcuts-page">
      {/* ── Header ── */}
      <header className="feed-header">
        <h1 className="logo logo-small" onClick={() => navigate("/feed")} style={{ cursor: "pointer" }}>Facebook</h1>
        <div className="feed-header-right">
          <button className="header-icon-btn" onClick={() => navigate("/search")}><FiSearch size={20} /></button>
          <button className="header-icon-btn" onClick={() => navigate("/notifications")} aria-label="Notifications">
             <FiBell size={20} />
          </button>
        </div>
      </header>

      {/* ── Search People ── */}
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
                onClick={() => addPersonShortcut(person.name)}
              >
                <span className="shortcut-icon">👤</span>
                <span>{person.name}</span>
                <FiPlus size={16} className="shortcuts-add-icon" />
              </button>
            ))}
          </div>
        )}
      </section>

      {/* ── Add Custom URL ── */}
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

      {/* ── Current Shortcuts ── */}
      <section className="shortcuts-section">
        <h3 className="shortcuts-section-title">
          Your Shortcuts ({shortcuts.length})
        </h3>
        {shortcuts.length === 0 ? (
          <p className="shortcuts-empty">No shortcuts yet. Add one above!</p>
        ) : (
          <div className="shortcuts-list">
            {shortcuts.map((s) => (
              <div key={s.id} className="shortcuts-list-item">
                <div className="shortcut-icon">{s.icon}</div>
                <div className="shortcuts-list-item-info">
                  <span className="shortcuts-list-item-title">{s.title}</span>
                  {s.url !== "#" && (
                    <span className="shortcuts-list-item-url">{s.url}</span>
                  )}
                </div>
                <button
                  className="shortcuts-remove-btn"
                  onClick={() => handleRemove(s.id)}
                  aria-label={`Remove ${s.title}`}
                >
                  <FiX size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

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
