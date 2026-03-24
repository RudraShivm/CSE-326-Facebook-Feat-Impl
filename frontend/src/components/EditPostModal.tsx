import { useState } from "react";
import { createPortal } from "react-dom";
import { FiX } from "react-icons/fi";

interface EditPostModalProps {
  isOpen: boolean;
  postId: string;
  initialContent: string;
  initialVisibility: string;
  onClose: () => void;
  onSave: (postId: string, content: string, visibility: string) => Promise<void>;
  onDelete: (postId: string) => Promise<void>;
}

export default function EditPostModal({
  isOpen,
  postId,
  initialContent,
  initialVisibility,
  onClose,
  onSave,
  onDelete,
}: EditPostModalProps) {
  const [content, setContent] = useState(initialContent);
  const [visibility, setVisibility] = useState(initialVisibility);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!content.trim()) return;
    setIsSaving(true);
    try {
      await onSave(postId, content, visibility);
      onClose();
    } catch (err) {
      console.error("Failed to save post:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onDelete(postId);
      onClose();
    } catch (err) {
      console.error("Failed to delete post:", err);
    } finally {
      setIsDeleting(false);
    }
  };

  const visibilityOptions = [
    { value: "PUBLIC", label: "🌐 Public" },
    { value: "FRIENDS", label: "👥 Friends" },
    { value: "PRIVATE", label: "🔒 Only me" },
  ];

  return createPortal(
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Edit Post</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            <FiX size={22} />
          </button>
        </div>

        <div className="create-post-author" style={{ padding: "16px 16px 0 16px" }}>
          {/* We don't have user in props, but we could add it. For now, just show the visibility selector nicely */}
          <div>
            <select
              className="visibility-select"
              value={visibility}
              onChange={(e) => setVisibility(e.target.value)}
              id="edit-visibility-selector"
            >
              {visibilityOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ padding: "0 16px" }}>
          <textarea
            className="create-post-textarea"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            maxLength={5000}
            rows={5}
            style={{ marginTop: 8 }}
          />
        </div>

        <div className="edit-post-actions" style={{ padding: "16px", display: "flex", gap: "8px", justifyContent: "flex-end" }}>
          <button className="btn btn-secondary" onClick={onClose} disabled={isSaving}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={isSaving || !content.trim()}
          >
            {isSaving ? "Saving..." : "Save"}
          </button>
        </div>

        {/* Delete Section */}
        <div className="edit-post-delete-section" style={{ padding: "16px", borderTop: "1px solid rgba(0,0,0,0.1)", background: "rgba(255,0,0,0.02)" }}>
          {!confirmDelete ? (
            <button
              className="btn btn-danger"
              onClick={() => setConfirmDelete(true)}
              disabled={isDeleting}
              style={{ width: "100%", padding: "8px" }}
            >
              Delete Post
            </button>
          ) : (
            <div style={{ textAlign: "center" }}>
              <p style={{ fontSize: "0.85rem", marginBottom: "8px", color: "var(--color-error)" }}>
                Are you sure? This cannot be undone.
              </p>
              <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
                <button className="btn btn-secondary" onClick={() => setConfirmDelete(false)} disabled={isDeleting}>
                  Cancel
                </button>
                <button className="btn btn-danger" onClick={handleDelete} disabled={isDeleting}>
                  {isDeleting ? "Deleting..." : "Yes, Delete"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
