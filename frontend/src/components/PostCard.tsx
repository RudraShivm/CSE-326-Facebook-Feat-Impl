import { FiShare2, FiHeart, FiMessageCircle, FiMoreHorizontal, FiGlobe, FiUsers, FiLock, FiBookmark, FiEdit2 } from "react-icons/fi";
import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Post, updatePost, deletePost, createPost } from "../api/posts";
import CommentSection from "./CommentSection";
import EditPostModal from "./EditPostModal";
import { togglePostReaction } from "../api/reactions";
import { savePost, unsavePost } from "../api/users";
import { useAuth } from "../contexts/AuthContext";

interface PostCardProps {
  post: Post;
  onCommentClick?: (postId: string) => void;
  onPostDeleted?: (postId: string) => void;
  onPostUpdated?: (post: Post) => void;
  initiallyShowComments?: boolean;
}

// Format timestamp string to relative time (e.g., "2h ago")
function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return new Date(dateStr).toLocaleDateString();
}

// Visibility icon matching MockUI
function VisibilityIcon({ visibility }: { visibility: string }) {
  switch (visibility) {
    case "PUBLIC": return <FiGlobe size={12} title="Public" />;
    case "FRIENDS": return <FiUsers size={12} title="Friends" />;
    case "PRIVATE": return <FiLock size={12} title="Only me" />;
    default: return <FiGlobe size={12} />;
  }
}

const POST_COLLAPSE_LIMIT = 300;

export default function PostCard({ post, onCommentClick, onPostDeleted, onPostUpdated, initiallyShowComments = false }: PostCardProps) {
  const [showComments, setShowComments] = useState(initiallyShowComments);
  const [showMenu, setShowMenu] = useState(false);
  const [isReacted, setIsReacted] = useState((post as any).hasReacted || false);
  const [likeCount, setLikeCount] = useState(post.likeCount);
  const [shareCount, setShareCount] = useState(post.shareCount);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSaved, setIsSaved] = useState(!!post.isSaved);
  const [showEditModal, setShowEditModal] = useState(false);
  const [currentContent, setCurrentContent] = useState(post.content);
  const [currentVisibility, setCurrentVisibility] = useState(post.visibility);
  const [shareToast, setShareToast] = useState<{ visible: boolean; type: "success" | "error"; message: string }>({ visible: false, type: "success", message: "" });
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const menuRef = useRef<HTMLDivElement>(null);

  const isOwner = user?.userId === post.authorId;

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const authorName = `${post.author.firstName} ${post.author.lastName}`;
  const initials = `${post.author.firstName[0]}${post.author.lastName[0]}`;
  const isLongContent = currentContent && currentContent.length > POST_COLLAPSE_LIMIT;

  const handleSavePost = async () => {
    if (!user) return;
    const previouslySaved = isSaved;
    setIsSaved(!previouslySaved);
    setShowMenu(false);
    
    try {
      if (previouslySaved) {
        await unsavePost(user.userId, post.id);
      } else {
        await savePost(user.userId, post.id);
      }
    } catch (err) {
      setIsSaved(previouslySaved);
    }
  };

  // Simplified toggle strategy (assuming clicking 'React' sends a LIKE)
  const handleReact = async () => {
    const currentlyReacted = isReacted;
    setIsReacted(!currentlyReacted);
    setLikeCount(prev => currentlyReacted ? prev - 1 : prev + 1);

    try {
      const result = await togglePostReaction(post.id, "LIKE");
      if (result.status === "removed") setIsReacted(false);
      else setIsReacted(true);
    } catch (err) {
      setIsReacted(currentlyReacted);
      setLikeCount(prev => currentlyReacted ? prev + 1 : prev - 1);
    }
  };

  const handleEditSave = async (postId: string, content: string, visibility: string) => {
    const updated = await updatePost(postId, { content, visibility: visibility as Post["visibility"] });
    setCurrentContent(updated.content);
    setCurrentVisibility(updated.visibility);
    onPostUpdated?.(updated);
  };

  const handleDeletePost = async (postId: string) => {
    await deletePost(postId);
    onPostDeleted?.(postId);
  };

  const handleShare = async () => {
    if (!user) return;
    try {
      const idToShare = post.sharedPostId || post.id;
      await createPost({ content: "", sharedPostId: idToShare, sourcePostId: post.id, visibility: "PUBLIC" });
      setShareCount(prev => prev + 1);
      setShareToast({ visible: true, type: "success", message: "Post shared successfully!" });
    } catch (e) {
      console.error(e);
      setShareToast({ visible: true, type: "error", message: "Failed to share post." });
    }
    setTimeout(() => setShareToast({ visible: false, type: "success", message: "" }), 3000);
  };

  return (
    <article className="post-card card" id={`post-${post.id}`}>
      {/* ── Header ── */}
      <div className="post-header">
        <div className="post-avatar">
          {post.author.profilePicture ? (
            <img src={post.author.profilePicture} alt={authorName} />
          ) : (
            <span className="avatar-initials">{initials}</span>
          )}
        </div>
        <div className="post-meta">
          <span className="post-author-name">{authorName}</span>
          <span className="post-time">
            {timeAgo(post.createdAt)} · <VisibilityIcon visibility={currentVisibility} />
          </span>
        </div>
        <div className="post-menu-container" ref={menuRef}>
          <button 
            className="post-more-btn" 
            aria-label="More options"
            onClick={() => setShowMenu(!showMenu)}
          >
            <FiMoreHorizontal size={20} />
          </button>
          
          {showMenu && (
            <div className="post-dropdown-menu">
              <button className="post-dropdown-item" onClick={handleSavePost}>
                <FiBookmark size={16} fill={isSaved ? "currentColor" : "none"} />
                <span>{isSaved ? "Unsave post" : "Save post"}</span>
              </button>
              {isOwner && (
                <button
                  className="post-dropdown-item"
                  onClick={() => {
                    setShowMenu(false);
                    setShowEditModal(true);
                  }}
                >
                  <FiEdit2 size={16} />
                  <span>Edit post</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Content ── */}
      <div className="post-content">
        <p>
          {isLongContent && !isExpanded
            ? currentContent.slice(0, POST_COLLAPSE_LIMIT) + "..."
            : currentContent}
        </p>
        {isLongContent && (
          <button
            className="see-more-btn"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? "See less" : "See more"}
          </button>
        )}
      </div>

      {/* ── Shared Post Embed ── */}
      {post.sharedPost && (
        <div className="shared-post-embed" style={{ border: "1px solid var(--border-color)", borderLeft: "3px solid var(--primary-color)", margin: "0 16px 16px", padding: "12px", borderRadius: "8px", cursor: "pointer" }} onClick={() => navigate(`/profile/${post.sharedPost!.author.id}`)}>
          <div className="shared-post-header" style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "8px" }}>
             <img src={post.sharedPost.author.profilePicture || "https://placehold.co/40x40"} style={{ width: "24px", height: "24px", borderRadius: "50%", objectFit: "cover", backgroundColor: "var(--bg-secondary)" }} />
             <span style={{ fontWeight: 600, fontSize: "0.9rem", color: "var(--text-primary)" }}>{post.sharedPost.author.firstName} {post.sharedPost.author.lastName}</span>
             <span style={{ color: "var(--text-secondary)", fontSize: "0.8rem" }}>· {timeAgo(post.sharedPost.createdAt)}</span>
          </div>
          <p style={{ fontSize: "0.95rem", margin: 0, whiteSpace: "pre-wrap" }}>{post.sharedPost.content}</p>
          {post.sharedPost.imageUrl && <img src={post.sharedPost.imageUrl} alt="Shared post image" style={{ width: "100%", borderRadius: "8px", marginTop: "8px" }} />}
          {post.sharedPost.videoUrl && <video src={post.sharedPost.videoUrl} controls style={{ width: "100%", borderRadius: "8px", marginTop: "8px" }} />}
        </div>
      )}

      {/* ── Media ── */}
      {post.imageUrl && (
        <div className="post-media">
          <img src={post.imageUrl} alt="Post image" className="post-image" />
        </div>
      )}
      {post.videoUrl && (
        <div className="post-media">
          <video src={post.videoUrl} controls className="post-video" />
        </div>
      )}

      {/* ── Action Bar ── */}
      <div className="post-actions">
        <button className="post-action-btn" id={`share-${post.id}`} onClick={handleShare}>
          <FiShare2 size={18} />
          <span>{shareCount || 0}</span>
        </button>
        <button
          className={`post-action-btn post-action-heart ${isReacted ? "reacted" : ""}`}
          id={`react-${post.id}`}
          onClick={handleReact}
        >
          <FiHeart size={18} fill={isReacted ? "var(--color-error)" : "none"} color={isReacted ? "var(--color-error)" : "currentColor"} />
          <span>{likeCount}</span>
        </button>
        <button
          className="post-action-btn post-action-comment"
          id={`comment-btn-${post.id}`}
          onClick={() => {
            setShowComments(!showComments);
            onCommentClick?.(post.id);
          }}
        >
          <FiMessageCircle size={18} />
          <span>{post.commentCount}</span>
        </button>
      </div>

      {/* ── Share Toast ── */}
      {shareToast.visible && (
        <div className={`share-toast share-toast--${shareToast.type}`}>
          {shareToast.message}
        </div>
      )}

      {/* ── Comment Section ── */}
      <CommentSection postId={post.id} isOpen={showComments} />

      {/* ── Edit Post Modal ── */}
      {showEditModal && (
        <EditPostModal
          isOpen={showEditModal}
          postId={post.id}
          initialContent={currentContent}
          initialVisibility={currentVisibility}
          onClose={() => setShowEditModal(false)}
          onSave={handleEditSave}
          onDelete={handleDeletePost}
        />
      )}
    </article>
  );
}
