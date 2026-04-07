import { useState, useEffect, FormEvent, useRef } from "react";
import { FiSend, FiTrash2, FiEdit2, FiHeart, FiCheck, FiX, FiCornerDownRight, FiMessageSquare } from "react-icons/fi";
import { useAuth } from "../contexts/AuthContext";
import {
  Comment,
  getComments,
  addComment,
  deleteComment,
  updateComment,
  addReply,
  getReplies,
  updateReply,
} from "../api/comments";
import { toggleCommentReaction } from "../api/reactions";
import { useNavigate } from "react-router-dom";

interface CommentSectionProps {
  postId: string;
  isOpen: boolean;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

const COMMENT_COLLAPSE_LIMIT = 150;

function CommentText({
  text,
}: {
  text: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const isLong = text.length > COMMENT_COLLAPSE_LIMIT;

  return (
    <p className="comment-text">
      {isLong && !expanded ? text.slice(0, COMMENT_COLLAPSE_LIMIT) + "..." : text}
      {isLong && (
        <button
          className="see-more-btn see-more-btn-inline"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? "See less" : "See more"}
        </button>
      )}
    </p>
  );
}

function Avatar({
  profilePicture,
  firstName,
  lastName,
  size = 32,
  onClick,
}: {
  profilePicture: string | null;
  firstName: string;
  lastName: string;
  size?: number;
  onClick?: () => void;
}) {
  return (
    <div
      className="post-avatar"
      style={{ width: size, height: size, cursor: onClick ? "pointer" : "default", flexShrink: 0 }}
      onClick={onClick}
    >
      {profilePicture ? (
        <img
          src={profilePicture}
          alt=""
          style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover" }}
        />
      ) : (
        <span className="avatar-initials" style={{ fontSize: size < 36 ? "0.65rem" : "0.875rem" }}>
          {firstName[0]}
          {lastName[0]}
        </span>
      )}
    </div>
  );
}

// ─── Recursive Reply Thread ──────────────────────────────────
interface ReplyThreadProps {
  parentId: string;
  postId: string;
  currentUserId?: string;
  initialCount: number;
}

function ReplyThread({ parentId, postId, currentUserId, initialCount }: ReplyThreadProps) {
  const [replies, setReplies] = useState<Comment[]>([]);
  const [hasFetched, setHasFetched] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [replyCount, setReplyCount] = useState(initialCount); // Local count that updates

  const fetchBatch = async (cursor?: string) => {
    setIsLoading(true);
    try {
      const res = await getReplies(postId, parentId, cursor, 5);
      setReplies((prev) => (cursor ? [...prev, ...res.replies] : res.replies));
      setNextCursor(res.nextCursor);
      setHasMore(res.hasMore);
      setHasFetched(true);
    } catch (err) {
      console.error("Failed to load replies:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddReplyLocally = (newReply: Comment) => {
    setReplies((prev) => [newReply, ...prev]);
    setReplyCount((c) => c + 1); // Update count so "View replies" button reflects new state
    setHasFetched(true);
    setIsExpanded(true);
  };

  const handleDeleteReplyLocally = (id: string) => {
    setReplies((prev) => prev.filter((r) => r.id !== id));
    setReplyCount((c) => Math.max(0, c - 1));
  };

  const handleUpdateReplyLocally = (id: string, newContent: string) => {
    setReplies((prev) => prev.map((r) => (r.id === id ? { ...r, content: newContent } : r)));
  };

  const handleToggle = () => {
    if (!hasFetched) {
      fetchBatch();
      setIsExpanded(true);
    } else {
      setIsExpanded(!isExpanded);
    }
  };

  // Ensure ReplyInput is always available
  const inputEl = <ReplyInput parentId={parentId} postId={postId} onReplyAdded={handleAddReplyLocally} />;

  return (
    <div className="reply-thread">
      <div className="reply-controls-row">
        {inputEl}
        {replyCount > 0 && (
          <button className="view-replies-btn" onClick={handleToggle} disabled={isLoading}>
            <FiCornerDownRight size={12} style={{ marginRight: 4 }} />
            {isLoading ? "Loading..." : (isExpanded ? "Hide replies" : `View ${replyCount} ${replyCount === 1 ? 'reply' : 'replies'}`)}
          </button>
        )}
      </div>

      {isExpanded && hasFetched && (
        <div className="reply-list">
          {replies.map((r) => (
            <CommentItem
              key={r.id}
              comment={r}
              postId={postId}
              currentUserId={currentUserId}
              onDelete={handleDeleteReplyLocally}
              onUpdate={handleUpdateReplyLocally}
              isReply
            />
          ))}
          
          {hasMore && (
            <button className="view-replies-btn load-more-replies" onClick={() => nextCursor && fetchBatch(nextCursor)} disabled={isLoading}>
              {isLoading ? "Loading..." : "Load more replies"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Inline Reply Input ──────────────────────────────────────
interface ReplyInputProps {
  parentId: string;
  postId: string;
  onReplyAdded: (reply: Comment) => void;
}

function ReplyInput({ parentId, postId, onReplyAdded }: ReplyInputProps) {
  const { user } = useAuth();
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showInput, setShowInput] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!content.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const reply = await addReply(postId, parentId, content.trim());
      onReplyAdded(reply);
      setContent("");
      setShowInput(false);
    } catch (err) {
      console.error("Failed to post reply:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!showInput) {
    return (
      <button className="comment-action-link comment-reply-btn" onClick={() => setShowInput(true)} style={{ marginBottom: 4 }}>
        <FiMessageSquare size={11} />
        <span>Reply</span>
      </button>
    );
  }

  return (
    <form className="reply-input-area" onSubmit={handleSubmit}>
      <div className="reply-input-row">
        <Avatar profilePicture={user?.profilePicture ?? null} firstName={user?.firstName ?? "U"} lastName={user?.lastName ?? ""} size={28} />
        <textarea
          ref={inputRef}
          className="comment-input reply-input"
          placeholder="Write a reply..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(e as any);
            }
          }}
          autoFocus
          rows={1}
        />
        <button type="submit" className="comment-send-btn" disabled={!content.trim() || isSubmitting}>
          <FiSend size={14} />
        </button>
      </div>
    </form>
  );
}

// ─── Recursive Comment Item ──────────────────────────────────
interface CommentItemProps {
  comment: Comment;
  postId: string;
  currentUserId?: string;
  onDelete: (id: string) => void;
  onUpdate: (id: string, content: string) => void;
  isReply?: boolean;
}

function CommentItem({ comment, postId, currentUserId, onDelete, onUpdate, isReply }: CommentItemProps) {
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [isLiked, setIsLiked] = useState(comment.hasReacted);
  const [likeCount, setLikeCount] = useState(comment._count?.reactions ?? 0);
  const isOwn = comment.authorId === currentUserId;

  const handleLike = async () => {
    const wasLiked = isLiked;
    setIsLiked(!wasLiked);
    setLikeCount((c) => c + (wasLiked ? -1 : 1));
    try {
      const result = await toggleCommentReaction(comment.id, "LIKE");
      setIsLiked(result.status !== "removed");
    } catch {
      setIsLiked(wasLiked);
      setLikeCount((c) => c + (wasLiked ? 1 : -1));
    }
  };

  const handleSave = async () => {
    if (!editContent.trim()) return;
    try {
      if (isReply) await updateReply(postId, comment.id, editContent.trim());
      else await updateComment(postId, comment.id, editContent.trim());
      onUpdate(comment.id, editContent.trim());
      setIsEditing(false);
    } catch (err) {
      console.error("Failed to update:", err);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteComment(postId, comment.id);
      onDelete(comment.id);
    } catch (err) {
      console.error("Failed to delete:", err);
    }
  };

  return (
    <div className="comment-thread-block">
      <div className="comment-item" id={`comment-${comment.id}`}>
        <Avatar
          profilePicture={comment.author.profilePicture}
          firstName={comment.author.firstName}
          lastName={comment.author.lastName}
          size={isReply ? 28 : 32}
          onClick={() => navigate(`/profile/${comment.authorId}`)}
        />
        <div className="comment-bubble" style={{ flex: 1 }}>
          <div className="comment-header">
            <span className="comment-author" onClick={() => navigate(`/profile/${comment.authorId}`)} style={{ cursor: "pointer" }}>
              {comment.author.firstName} {comment.author.lastName}
            </span>
            {isOwn && !isEditing && (
              <button className="comment-action-link comment-edit-trigger" onClick={() => setIsEditing(true)}>
                <FiEdit2 size={12} />
                <span>Edit</span>
              </button>
            )}
          </div>

          {isEditing ? (
            <div className="comment-edit-area">
              <textarea
                className="comment-edit-input"
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                rows={2}
                autoFocus
              />
              <div className="comment-edit-actions">
                <button className="comment-edit-btn" onClick={handleSave}><FiCheck size={14} /></button>
                <button className="comment-edit-btn" onClick={() => setIsEditing(false)}><FiX size={14} /></button>
                <button className="comment-edit-btn comment-delete-btn-inline" onClick={handleDelete}><FiTrash2 size={14} /></button>
              </div>
            </div>
          ) : (
            <div className="comment-body">
              <div className="comment-textbox">
                <CommentText text={comment.content} />
              </div>
            </div>
          )}

          <div className="comment-footer">
            <span className="comment-time">{timeAgo(comment.createdAt)}</span>
            <button className={`comment-like-btn ${isLiked ? "comment-liked" : ""}`} onClick={handleLike}>
              <FiHeart size={12} fill={isLiked ? "var(--color-error)" : "none"} color={isLiked ? "var(--color-error)" : "currentColor"} />
              <span style={{ marginLeft: 4 }}>{likeCount}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Recursive Replies */}
      <ReplyThread
        parentId={comment.id}
        postId={postId}
        currentUserId={currentUserId}
        initialCount={comment._count?.replies ?? 0}
      />
    </div>
  );
}

export default function CommentSection({ postId, isOpen }: CommentSectionProps) {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadComments();
    }
  }, [isOpen, postId]);

  const loadComments = async (cursor?: string) => {
    if (cursor) setIsLoadingMore(true);
    else setIsLoading(true);

    try {
      const res = await getComments(postId, cursor);
      setComments((prev) => (cursor ? [...prev, ...res.comments] : res.comments));
      setNextCursor(res.nextCursor);
      setHasMore(res.hasMore);
    } catch (err) {
      console.error("Failed to load comments:", err);
    } finally {
      if (cursor) setIsLoadingMore(false);
      else setIsLoading(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setIsSubmitting(true);
    try {
      const comment = await addComment(postId, newComment.trim());
      setComments((prev) => [comment, ...prev]);
      setNewComment("");
    } catch (err) {
      console.error("Failed to add comment:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTopLevel = (id: string) => {
    setComments((prev) => prev.filter((c) => c.id !== id));
  };

  const handleUpdateTopLevel = (id: string, content: string) => {
    setComments((prev) => prev.map((c) => (c.id === id ? { ...c, content } : c)));
  };

  if (!isOpen) return null;

  return (
    <div className="comment-section" id={`comments-${postId}`}>
      <form className="comment-input-form" onSubmit={handleSubmit} style={{ marginBottom: 16 }}>
        <Avatar profilePicture={user?.profilePicture ?? null} firstName={user?.firstName ?? "U"} lastName={user?.lastName ?? ""} size={32} />
        <textarea
          className="comment-input"
          placeholder="Write a comment..."
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(e as any);
            }
          }}
          disabled={isSubmitting}
          rows={1}
        />
        <button type="submit" className="comment-send-btn" disabled={!newComment.trim() || isSubmitting}>
          <FiSend size={16} />
        </button>
      </form>

      {isLoading ? (
        <p className="comment-loading">Loading comments...</p>
      ) : comments.length === 0 ? (
        <p className="comment-empty">No comments yet. Be the first!</p>
      ) : (
        <div className="comment-list">
          {comments.map((c) => (
            <CommentItem
              key={c.id}
              comment={c}
              postId={postId}
              currentUserId={user?.userId}
              onDelete={handleDeleteTopLevel}
              onUpdate={handleUpdateTopLevel}
            />
          ))}
        </div>
      )}

      {hasMore && (
        <div className="comment-load-more" style={{ textAlign: 'center', marginTop: 12 }}>
          <button className="see-more-btn" onClick={() => nextCursor && loadComments(nextCursor)} disabled={isLoadingMore}>
            {isLoadingMore ? "Loading..." : "View more comments"}
          </button>
        </div>
      )}
    </div>
  );
}
