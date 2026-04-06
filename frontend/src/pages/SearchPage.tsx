import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { searchAll, SearchUser, SearchResults } from "../api/search";
import { Post } from "../api/posts";
import PostCard from "../components/PostCard";
import GlobalMenu from "../components/GlobalMenu";
import { FiSearch, FiUser, FiFileText } from "react-icons/fi";
import { useCreatePostAction } from "../hooks/useCreatePostAction";

type FilterType = "all" | "users" | "posts";

export default function SearchPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const openCreatePost = useCreatePostAction();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [userPage, setUserPage] = useState(1);
  const [postPage, setPostPage] = useState(1);
  const [allUsers, setAllUsers] = useState<SearchUser[]>([]);
  const [allPosts, setAllPosts] = useState<Post[]>([]);
  const [showGlobalMenu, setShowGlobalMenu] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const inputRef = useRef<HTMLInputElement>(null);

  const INITIAL_LIMIT = 10;

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!query.trim()) {
      setResults(null);
      setAllUsers([]);
      setAllPosts([]);
      setUserPage(1);
      setPostPage(1);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setIsLoading(true);
      try {
        const res = await searchAll(query.trim(), filter, 1, INITIAL_LIMIT);
        setResults(res);
        setAllUsers(res.users);
        setAllPosts(res.posts);
        setUserPage(1);
        setPostPage(1);
      } catch (err) {
        console.error("Search failed:", err);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, filter]);

  const loadMoreUsers = async () => {
    const nextPage = userPage + 1;
    try {
      const res = await searchAll(query.trim(), "users", nextPage, INITIAL_LIMIT);
      setAllUsers(prev => [...prev, ...res.users]);
      setUserPage(nextPage);
    } catch (err) {
      console.error("Load more users failed:", err);
    }
  };

  const loadMorePosts = async () => {
    const nextPage = postPage + 1;
    try {
      const res = await searchAll(query.trim(), "posts", nextPage, INITIAL_LIMIT);
      setAllPosts(prev => [...prev, ...res.posts]);
      setPostPage(nextPage);
    } catch (err) {
      console.error("Load more posts failed:", err);
    }
  };

  const initials = user ? `${user.firstName[0]}${user.lastName[0]}` : "?";

  return (
    <div className="search-page">
      {/* ── Header ── */}
      <header className="feed-header">
        <h1 className="logo logo-small" onClick={() => navigate("/feed")} style={{ cursor: "pointer" }}>Facebook</h1>
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

      <main className="search-content">
        {/* Search Bar */}
        <div className="search-bar-container">
          <FiSearch size={18} className="search-bar-icon" />
          <input
            ref={inputRef}
            type="text"
            className="search-bar-input"
            placeholder="Search people and posts..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
        </div>

        {/* Filter Chips */}
        <div className="search-chips">
          <button
            className={`search-chip ${filter === "all" ? "search-chip-active" : ""}`}
            onClick={() => setFilter("all")}
          >
            All
          </button>
          <button
            className={`search-chip ${filter === "users" ? "search-chip-active" : ""}`}
            onClick={() => setFilter("users")}
          >
            <FiUser size={14} /> Profiles
          </button>
          <button
            className={`search-chip ${filter === "posts" ? "search-chip-active" : ""}`}
            onClick={() => setFilter("posts")}
          >
            <FiFileText size={14} /> Posts
          </button>
        </div>

        {/* Results */}
        {isLoading && <p className="search-status">Searching...</p>}

        {!isLoading && query.trim() && results && (
          <div className="search-results">
            {/* Users Section */}
            {filter !== "posts" && allUsers.length > 0 && (
              <div className="search-section">
                <h3 className="search-section-title">People</h3>
                <div className="search-users-list">
                  {allUsers.map((u) => (
                    <div
                      key={u.id}
                      className="search-user-card"
                      onClick={() => navigate(`/profile/${u.id}`)}
                    >
                      <div className="post-avatar" style={{ width: 40, height: 40 }}>
                        {u.profilePicture ? (
                          <img src={u.profilePicture} alt="" style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover" }} />
                        ) : (
                          <span className="avatar-initials" style={{ fontSize: "0.8rem" }}>
                            {u.firstName[0]}{u.lastName[0]}
                          </span>
                        )}
                      </div>
                      <div className="search-user-info">
                        <span className="search-user-name">{u.firstName} {u.lastName}</span>
                        {u.bio && <span className="search-user-bio">{u.bio.slice(0, 60)}{u.bio.length > 60 ? "..." : ""}</span>}
                      </div>
                    </div>
                  ))}
                </div>
                {results.userTotal > allUsers.length && (
                  <button className="search-see-more" onClick={loadMoreUsers}>
                    See more people ({results.userTotal - allUsers.length} remaining)
                  </button>
                )}
              </div>
            )}

            {/* Posts Section */}
            {filter !== "users" && allPosts.length > 0 && (
              <div className="search-section">
                <h3 className="search-section-title">Posts</h3>
                <div className="feed-list">
                  {allPosts.map((p) => (
                    <PostCard key={p.id} post={p} />
                  ))}
                </div>
                {results.postTotal > allPosts.length && (
                  <button className="search-see-more" onClick={loadMorePosts}>
                    See more posts ({results.postTotal - allPosts.length} remaining)
                  </button>
                )}
              </div>
            )}

            {/* No results */}
            {allUsers.length === 0 && allPosts.length === 0 && (
              <p className="search-status">No results found for "{query}"</p>
            )}
          </div>
        )}

        {!query.trim() && (
          <p className="search-status" style={{ marginTop: "3rem" }}>
            Start typing to search for people and posts
          </p>
        )}
      </main>

      {/* FAB */}
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
