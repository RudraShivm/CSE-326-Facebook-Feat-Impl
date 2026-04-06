import {
  FiShare2,
  FiHeart,
  FiMessageCircle,
  FiMoreHorizontal,
  FiGlobe,
  FiUsers,
  FiLock,
  FiBookmark,
  FiEdit2,
  FiTrash2,
} from "react-icons/fi";
import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { useLocation, useNavigate } from "react-router-dom";
import { Post, deletePost, createPost } from "../api/posts";
import CommentSection from "./CommentSection";
import AutoPlayVideo from "./AutoPlayVideo";
import { togglePostReaction } from "../api/reactions";
import { savePost, unsavePost } from "../api/users";
import { useAuth } from "../contexts/AuthContext";

interface PostCardProps {
  post: Post;
  onCommentClick?: (postId: string) => void;
  onPostDeleted?: (postId: string) => void;
  onPostUpdated?: (post: Post) => void;
  initiallyShowComments?: boolean;
  enableAutoplayVideo?: boolean;
}

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

function VisibilityIcon({ visibility }: { visibility: string }) {
  switch (visibility) {
    case "PUBLIC":
      return <FiGlobe size={12} title="Public" />;
    case "FRIENDS":
      return <FiUsers size={12} title="Friends" />;
    case "PRIVATE":
      return <FiLock size={12} title="Only me" />;
    default:
      return <FiGlobe size={12} />;
  }
}

const POST_COLLAPSE_LIMIT = 300;

export default function PostCard({
  post,
  onCommentClick,
  onPostDeleted,
  onPostUpdated,
  initiallyShowComments = false,
  enableAutoplayVideo = false,
}: PostCardProps) {
  const [showComments, setShowComments] = useState(initiallyShowComments);
  const [showMenu, setShowMenu] = useState(false);
  const [isReacted, setIsReacted] = useState((post as any).hasReacted || false);
  const [likeCount, setLikeCount] = useState(post.likeCount);
  const [shareCount, setShareCount] = useState(post.shareCount);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSaved, setIsSaved] = useState(!!post.isSaved);
  const [shareToast, setShareToast] = useState<{ visible: boolean; type: "success" | "error"; message: string }>({
    visible: false,
    type: "success",
    message: "",
  });
  const [saveToast, setSaveToast] = useState<{ visible: boolean; type: "success" | "info" | "error"; message: string }>({
    visible: false,
    type: "success",
    message: "",
  });
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const cardRef = useRef<HTMLElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; right: number; minWidth: number } | null>(null);

  const isOwner = user?.userId === post.authorId;
  const canDeleteFromMenu = Boolean(onPostDeleted);
  const authorName = `${post.author.firstName} ${post.author.lastName}`;
  const initials = `${post.author.firstName[0]}${post.author.lastName[0]}`;
  const isLongContent = post.content && post.content.length > POST_COLLAPSE_LIMIT;

  useEffect(() => {
    setIsReacted((post as any).hasReacted || false);
    setLikeCount(post.likeCount);
    setShareCount(post.shareCount);
    setIsSaved(!!post.isSaved);
  }, [post]);

  useEffect(() => {
    if (!showMenu) {
      return;
    }

    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;

      if (menuRef.current?.contains(target) || menuButtonRef.current?.contains(target)) {
        return;
      }

      setShowMenu(false);
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showMenu]);

  useEffect(() => {
    if (!showMenu) {
      return;
    }

    function updateMenuPosition() {
      const rect = menuButtonRef.current?.getBoundingClientRect();
      if (!rect) {
        return;
      }

      const minMenuWidth = 190;
      const estimatedMenuHeight = 148;
      const cardRect = cardRef.current?.getBoundingClientRect();
      const contentInset = 16;
      const preferredRightEdge = cardRect ? cardRect.right - contentInset : rect.right;
      const right = Math.max(16, window.innerWidth - preferredRightEdge);
      const preferredTop = rect.bottom + 8;
      const top =
        preferredTop + estimatedMenuHeight > window.innerHeight - 16
          ? Math.max(16, rect.top - estimatedMenuHeight - 8)
          : preferredTop;

      setMenuPosition({ top, right, minWidth: minMenuWidth });
    }

    updateMenuPosition();
    window.addEventListener("resize", updateMenuPosition);
    window.addEventListener("scroll", updateMenuPosition, true);

    return () => {
      window.removeEventListener("resize", updateMenuPosition);
      window.removeEventListener("scroll", updateMenuPosition, true);
    };
  }, [showMenu]);

  const handleSavePost = async () => {
    if (!user) return;
    const previouslySaved = isSaved;
    setIsSaved(!previouslySaved);
    setShowMenu(false);

    try {
      if (previouslySaved) {
        await unsavePost(user.userId, post.id);
        setSaveToast({ visible: true, type: "info", message: "Post removed from saved." });
      } else {
        await savePost(user.userId, post.id);
        setSaveToast({ visible: true, type: "success", message: "Post saved!" });
      }
    } catch {
      setIsSaved(previouslySaved);
      setSaveToast({ visible: true, type: "error", message: "Failed to update saved status." });
    }

    window.setTimeout(() => setSaveToast({ visible: false, type: "success", message: "" }), 3000);
  };

  const handleReact = async () => {
    const previouslyReacted = isReacted;
    setIsReacted(!previouslyReacted);
    setLikeCount((prev) => (previouslyReacted ? prev - 1 : prev + 1));

    try {
      const result = await togglePostReaction(post.id, "LIKE");
      setIsReacted(result.status !== "removed");
    } catch {
      setIsReacted(previouslyReacted);
      setLikeCount((prev) => (previouslyReacted ? prev + 1 : prev - 1));
    }
  };

  const handleDelete = async () => {
    setShowMenu(false);
    await deletePost(post.id);
    onPostDeleted?.(post.id);
  };

  const handleShare = async () => {
    if (!user) return;

    try {
      const idToShare = post.sharedPostId || post.id;
      const shared = await createPost({
        content: "",
        sharedPostId: idToShare,
        sourcePostId: post.id,
        visibility: "PUBLIC",
      });

      setShareCount((prev) => prev + 1);
      onPostUpdated?.(shared);
      setShareToast({ visible: true, type: "success", message: "Post shared successfully!" });
    } catch (error) {
      console.error(error);
      setShareToast({ visible: true, type: "error", message: "Failed to share post." });
    }

    window.setTimeout(() => setShareToast({ visible: false, type: "success", message: "" }), 3000);
  };

  const handleEdit = () => {
    setShowMenu(false);
    navigate(`/post/${post.id}/edit`, {
      state: {
        returnTo: `${location.pathname}${location.search}`,
      },
    });
  };

  const menuContent =
    showMenu && menuPosition
      ? createPortal(
          <div
            ref={menuRef}
            className="post-dropdown-menu post-dropdown-menu-portal"
            style={{
              position: "fixed",
              top: menuPosition.top,
              right: menuPosition.right,
              minWidth: menuPosition.minWidth,
            }}
          >
            <button className="post-dropdown-item" onClick={handleSavePost}>
              <FiBookmark size={16} fill={isSaved ? "currentColor" : "none"} />
              <span>{isSaved ? "Unsave post" : "Save post"}</span>
            </button>
            {isOwner && (
              <button className="post-dropdown-item" onClick={handleEdit}>
                <FiEdit2 size={16} />
                <span>Edit post</span>
              </button>
            )}
            {isOwner && canDeleteFromMenu && (
              <button className="post-dropdown-item post-dropdown-item-danger" onClick={handleDelete}>
                <FiTrash2 size={16} />
                <span>Delete post</span>
              </button>
            )}
          </div>,
          document.body
        )
      : null;

  return (
    <article ref={cardRef} className="post-card card" id={`post-${post.id}`}>
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
            {timeAgo(post.createdAt)} · <VisibilityIcon visibility={post.visibility} />
          </span>
        </div>
        <div className="post-menu-container">
          <button
            ref={menuButtonRef}
            className="post-more-btn"
            aria-label="More options"
            aria-expanded={showMenu}
            onClick={() => setShowMenu((prev) => !prev)}
          >
            <FiMoreHorizontal size={20} />
          </button>
        </div>
      </div>

      <div className="post-content">
        <p>
          {isLongContent && !isExpanded
            ? `${post.content.slice(0, POST_COLLAPSE_LIMIT)}...`
            : post.content}
        </p>
        {isLongContent && (
          <button className="see-more-btn" onClick={() => setIsExpanded((prev) => !prev)}>
            {isExpanded ? "See less" : "See more"}
          </button>
        )}
      </div>

      {post.sharedPost && (
        <div
          className="shared-post-embed"
          style={{
            borderTop: "1px solid var(--color-border)",
            boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.05)",
            margin: "0 var(--space-md) var(--space-md)",
            padding: "var(--space-md)",
            borderRadius: "var(--radius-md)",
            cursor: "pointer",
            background: "var(--color-background)",
          }}
          onClick={() => navigate(`/post/${post.sharedPost!.id}`)}
        >
          <div
            className="shared-post-header"
            style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "8px" }}
          >
            <img
              src={post.sharedPost.author.profilePicture || "https://placehold.co/40x40"}
              style={{
                width: "24px",
                height: "24px",
                borderRadius: "50%",
                objectFit: "cover",
                backgroundColor: "var(--bg-secondary)",
                cursor: "pointer",
              }}
              onClick={(event) => {
                event.stopPropagation();
                navigate(`/profile/${post.sharedPost!.author.id}`);
              }}
            />
            <span
              className="post-author-name"
              style={{ fontSize: "0.9rem", paddingRight: "0px" }}
              onClick={(event) => {
                event.stopPropagation();
                navigate(`/profile/${post.sharedPost!.author.id}`);
              }}
            >
              {post.sharedPost.author.firstName} {post.sharedPost.author.lastName}
            </span>
            <span style={{ color: "var(--color-text-secondary)", fontSize: "0.8rem" }}>
              · {timeAgo(post.sharedPost.createdAt)}
            </span>
          </div>
          <p
            style={{
              fontSize: "0.95rem",
              margin: 0,
              whiteSpace: "pre-wrap",
              color: "var(--color-text)",
            }}
          >
            {post.sharedPost.content}
          </p>
          {post.sharedPost.imageUrl && (
            <img
              src={post.sharedPost.imageUrl}
              alt="Shared post image"
              style={{ width: "100%", borderRadius: "8px", marginTop: "8px" }}
            />
          )}
          {post.sharedPost.videoUrl && (
            <AutoPlayVideo
              src={post.sharedPost.videoUrl}
              controls
              autoPlayWhenVisible={enableAutoplayVideo}
              style={{ width: "100%", borderRadius: "8px", marginTop: "8px" }}
            />
          )}
        </div>
      )}

      {post.imageUrl && (
        <div className="post-media">
          <img src={post.imageUrl} alt="Post image" className="post-image" />
        </div>
      )}
      {post.videoUrl && (
        <div className="post-media">
          <AutoPlayVideo
            src={post.videoUrl}
            controls
            autoPlayWhenVisible={enableAutoplayVideo}
            className="post-video"
          />
        </div>
      )}

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
          <FiHeart
            size={18}
            fill={isReacted ? "var(--color-error)" : "none"}
            color={isReacted ? "var(--color-error)" : "currentColor"}
          />
          <span>{likeCount}</span>
        </button>
        <button
          className="post-action-btn post-action-comment"
          id={`comment-btn-${post.id}`}
          onClick={() => {
            setShowComments((prev) => !prev);
            onCommentClick?.(post.id);
          }}
        >
          <FiMessageCircle size={18} />
          <span>{post.commentCount}</span>
        </button>
      </div>

      {shareToast.visible && <div className={`share-toast share-toast--${shareToast.type}`}>{shareToast.message}</div>}
      {saveToast.visible && <div className={`share-toast share-toast--${saveToast.type}`}>{saveToast.message}</div>}

      <CommentSection postId={post.id} isOpen={showComments} />
      {menuContent}
    </article>
  );
}
