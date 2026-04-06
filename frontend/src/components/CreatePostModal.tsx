import { useState, FormEvent, useRef } from "react";
import { FiX, FiGlobe, FiUsers, FiLock, FiImage } from "react-icons/fi";
import { useAuth } from "../contexts/AuthContext";
import { createPost, CreatePostInput, Post } from "../api/posts";
import { uploadMedia } from "../api/storage";

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPostCreated: (post: Post) => void;
}

const visibilityOptions = [
  { value: "PUBLIC" as const, label: "Public", icon: <FiGlobe /> },
  { value: "FRIENDS" as const, label: "Friends", icon: <FiUsers /> },
  { value: "PRIVATE" as const, label: "Only Me", icon: <FiLock /> },
];

export default function CreatePostModal({ isOpen, onClose, onPostCreated }: CreatePostModalProps) {
  const { user } = useAuth();
  const [content, setContent] = useState("");
  const [visibility, setVisibility] = useState<"PUBLIC" | "FRIENDS" | "PRIVATE">("PUBLIC");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  
  // Media state
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Max 10MB check
    if (file.size > 10 * 1024 * 1024) {
      setError("File must be less than 10MB");
      return;
    }

    setAttachedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setError("");
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!content.trim() && !attachedFile) return;

    setIsSubmitting(true);
    setError("");

    try {
      const data: CreatePostInput = { content: content.trim(), visibility };

      // If there's a file, upload it first
      if (attachedFile) {
        const url = await uploadMedia(attachedFile);
        if (attachedFile.type.startsWith("image/")) data.imageUrl = url;
        if (attachedFile.type.startsWith("video/")) data.videoUrl = url;
      }

      const newPost = await createPost(data);
      onPostCreated(newPost);
      
      // Reset states
      setContent("");
      setVisibility("PUBLIC");
      setAttachedFile(null);
      setPreviewUrl(null);
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to create post.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content card" onClick={(e) => e.stopPropagation()} id="create-post-modal">
        {/* Header */}
        <div className="modal-header">
          <h2>Create Post</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            <FiX size={22} />
          </button>
        </div>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          {/* Author */}
          <div className="create-post-author">
            <div className="post-avatar">
              <span className="avatar-initials">
                {user?.firstName[0]}{user?.lastName[0]}
              </span>
            </div>
            <div>
              <span className="post-author-name">{user?.firstName} {user?.lastName}</span>
              <select
                className="visibility-select"
                value={visibility}
                onChange={(e) => setVisibility(e.target.value as typeof visibility)}
                id="visibility-selector"
              >
                {visibilityOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Content */}
          <textarea
            className="create-post-textarea"
            placeholder="What's on your mind?"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={5}
            maxLength={5000}
            autoFocus
            id="post-content-input"
          />

          {/* ── Media Preview ── */}
          {previewUrl && (
            <div className="create-post-media-preview">
              <button 
                type="button" 
                className="media-remove-btn"
                onClick={() => {
                  setAttachedFile(null);
                  setPreviewUrl(null);
                }}
              >
                <FiX size={16} />
              </button>
              {attachedFile?.type.startsWith("image/") ? (
                <img src={previewUrl} alt="Preview" />
              ) : (
                <video src={previewUrl} controls />
              )}
            </div>
          )}

          {/* ── Media Attach Buttons ── */}
          <div className="create-post-attachments" onClick={() => fileInputRef.current?.click()}>
            <span>Add to your post</span>
            <div className="attachment-actions">
              <input 
                type="file" 
                hidden 
                ref={fileInputRef} 
                accept="image/*,video/*"
                onChange={handleFileChange}
              />
              <button type="button"  className="attach-btn" title="Add Photo/Video">
                <FiImage size={24} color="#45BD62" />
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={(!content.trim() && !attachedFile) || isSubmitting}
              id="submit-post-btn"
            >
              {isSubmitting ? "Posting..." : "Post"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
