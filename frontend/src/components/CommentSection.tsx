import { useState, useEffect, FormEvent } from "react";
import { FiSend, FiTrash2, FiEdit2, FiHeart, FiCheck, FiX } from "react-icons/fi";
import { useAuth } from "../contexts/AuthContext";
import { Comment, getComments, addComment, deleteComment, updateComment } from "../api/comments";
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

function CommentText({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = text.length > COMMENT_COLLAPSE_LIMIT;

  return (
    <p className="comment-text">
      {isLong && !expanded ? text.slice(0, COMMENT_COLLAPSE_LIMIT) + "..." : text}
      {isLong && (
        <button className="see-more-btn see-more-btn-inline" onClick={() => setExpanded(!expanded)}>
          {expanded ? "See less" : "See more"}
        </button>
      )}
    </p>
  );
}

export default function CommentSection({ postId, isOpen }: CommentSectionProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");

  // Like states — track which comments the user has liked (optimistic)
  const [likedComments, setLikedComments] = useState<Set<string>>(new Set());
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({});

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
      
      setComments(prev => cursor ? [...prev, ...res.comments] : res.comments);
      setNextCursor(res.nextCursor);
      setHasMore(res.hasMore);

      const counts: Record<string, number> = {};
      const initialLiked = new Set<string>();
      res.comments.forEach((c: any) => {
        counts[c.id] = c._count?.reactions || 0;
        if (c.hasReacted) initialLiked.add(c.id);
      });
      
      setLikeCounts(prev => cursor ? { ...prev, ...counts } : counts);
      setLikedComments(prev => {
        if (!cursor) return initialLiked;
        const newSet = new Set(prev);
        initialLiked.forEach(id => newSet.add(id));
        return newSet;
      });
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
      setComments((prev) => [...prev, comment]);
      setNewComment("");
    } catch (err) {
      console.error("Failed to add comment:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    try {
      await deleteComment(postId, commentId);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      setEditingId(null);
    } catch (err) {
      console.error("Failed to delete comment:", err);
    }
  };

  const handleStartEdit = (comment: Comment) => {
    setEditingId(comment.id);
    setEditContent(comment.content);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditContent("");
  };

  const handleSaveEdit = async (commentId: string) => {
    if (!editContent.trim()) return;
    try {
      const updated = await updateComment(postId, commentId, editContent.trim());
      setComments((prev) => prev.map((c) => (c.id === commentId ? updated : c)));
      setEditingId(null);
      setEditContent("");
    } catch (err) {
      console.error("Failed to update comment:", err);
    }
  };

  const handleLikeComment = async (commentId: string) => {
    const wasLiked = likedComments.has(commentId);
    // Optimistic update
    setLikedComments((prev) => {
      const next = new Set(prev);
      if (wasLiked) next.delete(commentId);
      else next.add(commentId);
      return next;
    });
    setLikeCounts((prev) => ({
      ...prev,
      [commentId]: (prev[commentId] || 0) + (wasLiked ? -1 : 1),
    }));

    try {
      const result = await toggleCommentReaction(commentId, "LIKE");
      if (result.status === "removed") {
        setLikedComments((prev) => {
          const next = new Set(prev);
          next.delete(commentId);
          return next;
        });
      } else {
        setLikedComments((prev) => new Set(prev).add(commentId));
      }
    } catch (err) {
      // Revert on error
      setLikedComments((prev) => {
        const next = new Set(prev);
        if (wasLiked) next.add(commentId);
        else next.delete(commentId);
        return next;
      });
      setLikeCounts((prev) => ({
        ...prev,
        [commentId]: (prev[commentId] || 0) + (wasLiked ? 1 : -1),
      }));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="comment-section" id={`comments-${postId}`}>
      {/* Comment List */}
      {isLoading ? (
        <p className="comment-loading">Loading comments...</p>
      ) : comments.length === 0 ? (
        <p className="comment-empty">No comments yet. Be the first!</p>
      ) : (
        <div className="comment-list">
          {comments.map((c) => {
            const isEditing = editingId === c.id;
            const isOwn = c.authorId === user?.userId;
            const isLiked = likedComments.has(c.id);

            return (
              <div key={c.id} className="comment-item" id={`comment-${c.id}`}>
                <div className="post-avatar" style={{ width: 32, height: 32, cursor: "pointer" }} onClick={() => navigate(`/profile/${c.authorId}`)}>
                  {c.author.profilePicture ? (
                    <img src={c.author.profilePicture} alt="" style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover" }} />
                  ) : (
                    <span className="avatar-initials" style={{ fontSize: "0.7rem" }}>
                      {c.author.firstName[0]}{c.author.lastName[0]}
                    </span>
                  )}
                </div>
                <div className="comment-bubble" style={{ flex: 1 }}>
                  <span className="comment-author" style={{ cursor: "pointer" }} onClick={() => navigate(`/profile/${c.authorId}`)}>{c.author.firstName} {c.author.lastName}</span>

                  {isEditing ? (
                    <div className="comment-edit-area">
                      <textarea
                        className="comment-edit-input"
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        rows={2}
                      />
                      <div className="comment-edit-actions">
                        <button className="comment-edit-btn" onClick={() => handleSaveEdit(c.id)} title="Save">
                          <FiCheck size={14} />
                        </button>
                        <button className="comment-edit-btn" onClick={handleCancelEdit} title="Cancel">
                          <FiX size={14} />
                        </button>
                        <button className="comment-edit-btn comment-delete-btn-inline" onClick={() => handleDelete(c.id)} title="Delete">
                          <FiTrash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <CommentText text={c.content} />
                  )}

                  <div className="comment-footer">
                    <span className="comment-time">{timeAgo(c.createdAt)}</span>
                    <button
                      className={`comment-like-btn ${isLiked ? "comment-liked" : ""}`}
                      onClick={() => handleLikeComment(c.id)}
                      title="Like"
                    >
                      <FiHeart size={12} fill={isLiked ? "var(--color-error)" : "none"} color={isLiked ? "var(--color-error)" : "currentColor"} />
                      <span style={{ marginLeft: 4 }}>{likeCounts[c.id] || 0}</span>
                    </button>
                    {isOwn && !isEditing && (
                      <button className="comment-action-link" onClick={() => handleStartEdit(c)} title="Edit">
                        <FiEdit2 size={12} />
                        <span>Edit</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {hasMore && (
        <div className="comment-load-more" style={{ padding: "8px 12px" }}>
          <button 
            className="see-more-btn" 
            onClick={() => nextCursor && loadComments(nextCursor)}
            disabled={isLoadingMore}
          >
            {isLoadingMore ? "Loading..." : "View more comments"}
          </button>
        </div>
      )}

      {/* Comment Input */}
      <form className="comment-input-form" onSubmit={handleSubmit}>
        <input
          type="text"
          className="comment-input"
          placeholder="Write a comment..."
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          disabled={isSubmitting}
          id={`comment-input-${postId}`}
        />
        <button
          type="submit"
          className="comment-send-btn"
          disabled={!newComment.trim() || isSubmitting}
          aria-label="Send comment"
        >
          <FiSend size={16} />
        </button>
      </form>
    </div>
  );
}
