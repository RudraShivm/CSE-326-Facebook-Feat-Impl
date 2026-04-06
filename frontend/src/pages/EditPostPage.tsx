import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { FiBell, FiGlobe, FiImage, FiLock, FiMoreHorizontal, FiSearch, FiTrash2, FiUsers, FiX } from "react-icons/fi";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { deletePost, getPost, Post, updatePost } from "../api/posts";
import { getApiErrorMessage } from "../api/error";
import { uploadMedia } from "../api/storage";
import { useAuth } from "../contexts/AuthContext";
import { useAppToast } from "../contexts/AppToastContext";
import GlobalMenu from "../components/GlobalMenu";
import AutoPlayVideo from "../components/AutoPlayVideo";
import { useCreatePostAction } from "../hooks/useCreatePostAction";
import { getEditPostDraft, removeEditPostDraft, saveEditPostDraft } from "../utils/editPostDrafts";

const MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024;

function VisibilityIcon({ visibility }: { visibility: Post["visibility"] }) {
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

export default function EditPostPage() {
  const { postId } = useParams<{ postId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { showToast } = useAppToast();
  const openCreatePost = useCreatePostAction();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [post, setPost] = useState<Post | null>(null);
  const [content, setContent] = useState("");
  const [visibility, setVisibility] = useState<Post["visibility"]>("PUBLIC");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showGlobalMenu, setShowGlobalMenu] = useState(false);
  const [showDeleteMenu, setShowDeleteMenu] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const originalDraftBaselineRef = useRef<{
    content: string;
    visibility: Post["visibility"];
    imageUrl: string | null;
    videoUrl: string | null;
  } | null>(null);

  const returnTo = (location.state as { returnTo?: string } | null)?.returnTo || (postId ? `/post/${postId}` : "/feed");
  const initials = user ? `${user.firstName[0]}${user.lastName[0]}` : "?";
  const mediaKind = useMemo(() => {
    if (selectedFile) {
      return selectedFile.type.startsWith("video/") ? "video" : "image";
    }

    if (videoUrl) return "video";
    if (imageUrl) return "image";
    return null;
  }, [imageUrl, selectedFile, videoUrl]);

  useEffect(() => {
    if (!postId) {
      setError("Post not found.");
      setIsLoading(false);
      return;
    }

    getPost(postId)
      .then((data) => {
        const draft = getEditPostDraft(data.id);
        const baseline = {
          content: data.content,
          visibility: data.visibility,
          imageUrl: data.imageUrl,
          videoUrl: data.videoUrl,
        };

        setPost(data);
        setContent(draft?.content ?? baseline.content);
        setVisibility(draft?.visibility ?? baseline.visibility);
        setImageUrl(draft?.imageUrl ?? baseline.imageUrl);
        setVideoUrl(draft?.videoUrl ?? baseline.videoUrl);
        originalDraftBaselineRef.current = baseline;
        setError(null);
      })
      .catch((err) => {
        console.error("Failed to load post for editing:", err);
        setError(getApiErrorMessage(err, "Failed to load this post for editing."));
      })
      .finally(() => setIsLoading(false));
  }, [postId]);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_UPLOAD_SIZE_BYTES) {
      setError("Media must be 10 MB or smaller.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setSelectedFile(file);
    setPreviewUrl(objectUrl);
    setImageUrl(null);
    setVideoUrl(null);
    setError(null);
  };

  const handleRemoveMedia = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setImageUrl(null);
    setVideoUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSave = async () => {
    if (!post) return;

    const hasBody = Boolean(content.trim()) || Boolean(post.sharedPostId) || Boolean(selectedFile) || Boolean(imageUrl) || Boolean(videoUrl);
    if (!hasBody) {
      setError("Post must have text, media, or a shared post.");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      let nextImageUrl = imageUrl;
      let nextVideoUrl = videoUrl;

      if (selectedFile) {
        const uploadedUrl = await uploadMedia(selectedFile);
        if (selectedFile.type.startsWith("video/")) {
          nextVideoUrl = uploadedUrl;
          nextImageUrl = null;
        } else {
          nextImageUrl = uploadedUrl;
          nextVideoUrl = null;
        }
      }

      await updatePost(post.id, {
        content,
        visibility,
        imageUrl: nextImageUrl,
        videoUrl: nextVideoUrl,
      });

      removeEditPostDraft(post.id);
      showToast("Post updated successfully!");
      navigate(returnTo, { replace: true });
    } catch (err) {
      console.error("Failed to update post:", err);
      setError(getApiErrorMessage(err, "Failed to update post."));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!post) return;

    try {
      await deletePost(post.id);
      removeEditPostDraft(post.id);
      showToast("Post deleted successfully!");
      navigate(returnTo === `/post/${post.id}` ? "/feed" : returnTo, { replace: true });
    } catch (err) {
      console.error("Failed to delete post:", err);
      setError(getApiErrorMessage(err, "Failed to delete post."));
    }
  };

  useEffect(() => {
    if (!post || !originalDraftBaselineRef.current) {
      return;
    }

    const baseline = originalDraftBaselineRef.current;
    const persistableDraft = {
      content,
      visibility,
      imageUrl: selectedFile ? baseline.imageUrl : imageUrl,
      videoUrl: selectedFile ? baseline.videoUrl : videoUrl,
    };

    const isDirty =
      persistableDraft.content !== baseline.content ||
      persistableDraft.visibility !== baseline.visibility ||
      persistableDraft.imageUrl !== baseline.imageUrl ||
      persistableDraft.videoUrl !== baseline.videoUrl;

    if (!isDirty) {
      removeEditPostDraft(post.id);
      return;
    }

    saveEditPostDraft({
      postId: post.id,
      ...persistableDraft,
    });
  }, [content, imageUrl, post, selectedFile, videoUrl, visibility]);

  return (
    <div className="feed-page edit-post-page">
      <header className="feed-header">
        <h1 className="logo logo-small" onClick={() => navigate("/feed")} style={{ cursor: "pointer" }}>
          Facebook
        </h1>
        <div className="feed-header-right">
          <button className="header-icon-btn" aria-label="Search" onClick={() => navigate("/search")}>
            <FiSearch size={20} />
          </button>
          <button className="header-icon-btn" aria-label="Notifications" onClick={() => navigate("/notifications")}>
            <FiBell size={20} />
          </button>
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

      <main className="feed-content edit-post-page-content">
        {isLoading ? (
          <div className="skeleton-card card">
            <div className="skeleton-line skeleton-short" />
            <div className="skeleton-line" />
            <div className="skeleton-line skeleton-medium" />
          </div>
        ) : !post ? (
          <div className="card" style={{ padding: "2rem", textAlign: "center" }}>
            {error || "Post not found."}
          </div>
        ) : (
          <section className="card modal-content edit-post-card">
            <div className="modal-header">
              <div>
                <h2>Edit Post</h2>
              </div>
              <div className="post-menu-container edit-post-menu">
                <button
                  className="post-more-btn"
                  aria-label="More options"
                  onClick={() => setShowDeleteMenu((prev) => !prev)}
                >
                  <FiMoreHorizontal size={20} />
                </button>
                {showDeleteMenu && (
                  <div className="post-dropdown-menu" style={{ right: 0, left: "auto" }}>
                    <button className="post-dropdown-item post-dropdown-item-danger" onClick={handleDelete}>
                      <FiTrash2 size={16} />
                      <span>Delete post</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {error && <div className="auth-error">{error}</div>}

            <div className="create-post-author edit-post-author">
              <div className="post-avatar">
                {user?.profilePicture ? (
                  <img src={user.profilePicture} alt="Profile" />
                ) : (
                  <span className="avatar-initials">{initials}</span>
                )}
              </div>
              <div className="edit-post-author-meta">
                <span className="post-author-name">{user ? `${user.firstName} ${user.lastName}` : "You"}</span>
                <select
                  className="visibility-select"
                  value={visibility}
                  onChange={(event) => setVisibility(event.target.value as Post["visibility"])}
                >
                  <option value="PUBLIC">Public</option>
                  <option value="FRIENDS">Friends</option>
                  <option value="PRIVATE">Only Me</option>
                </select>
              </div>
            </div>

            <div className="edit-post-body">
              <label className="edit-post-field">
                <span className="edit-post-label">{post.sharedPost ? "Your shared caption" : "Post content"}</span>
                <textarea
                  className="create-post-textarea edit-post-textarea"
                  value={content}
                  onChange={(event) => setContent(event.target.value)}
                  rows={6}
                  maxLength={5000}
                  placeholder={post.sharedPost ? "Say something about this shared post..." : "What's on your mind?"}
                />
              </label>

              {post.sharedPost && (
                <div style={{ margin: 0 }} onClick={() => navigate(`/post/${post.sharedPost!.id}`)}>
                  {(() => {
                    const sharedVisibility = (post.sharedPost as typeof post.sharedPost & { visibility?: Post["visibility"] }).visibility;

                    return (
                      <>
                  <p className="edit-post-label">Original shared post</p>
                  <div className="edit-post-shared-header">
                    <div className="post-avatar edit-post-shared-avatar">
                      {post.sharedPost.author.profilePicture ? (
                        <img src={post.sharedPost.author.profilePicture} alt={`${post.sharedPost.author.firstName} ${post.sharedPost.author.lastName}`} />
                      ) : (
                        <span className="avatar-initials">
                          {post.sharedPost.author.firstName[0]}
                          {post.sharedPost.author.lastName[0]}
                        </span>
                      )}
                    </div>
                    <div className="post-meta">
                      <span className="post-author-name">
                        {post.sharedPost.author.firstName} {post.sharedPost.author.lastName}
                      </span>
                      <span className="post-time">
                        {timeAgo(post.sharedPost.createdAt)}
                        {sharedVisibility ? (
                          <>
                            {" "}· <VisibilityIcon visibility={sharedVisibility} />
                          </>
                        ) : null}
                      </span>
                    </div>
                  </div>
                  <p className="edit-post-shared-content">{post.sharedPost.content}</p>
                  {post.sharedPost.imageUrl && (
                    <img
                      src={post.sharedPost.imageUrl}
                      alt="Shared post media"
                      style={{ width: "100%", borderRadius: "8px" }}
                    />
                  )}
                  {post.sharedPost.videoUrl && (
                    <AutoPlayVideo
                      src={post.sharedPost.videoUrl}
                      style={{ width: "100%", borderRadius: "8px" }}
                    />
                  )}
                      </>
                    );
                  })()}
                </div>
              )}

              <div className="edit-post-media-section">
                {(previewUrl || imageUrl || videoUrl) && (
                  <div className="create-post-media-preview">
                    <button type="button" className="media-remove-btn" onClick={handleRemoveMedia}>
                      <FiX size={16} />
                    </button>
                    {mediaKind === "video" ? (
                      <AutoPlayVideo src={previewUrl || videoUrl || ""} />
                    ) : (
                      <img src={previewUrl || imageUrl || ""} alt="Post media preview" />
                    )}
                  </div>
                )}
                <div className="create-post-attachments edit-post-attachments">
                  <span>{mediaKind ? "Replace the photo or video in this post" : "Add a photo or video to this post"}</span>
                  <div className="attachment-actions">
                    <input
                      ref={fileInputRef}
                      type="file"
                      hidden
                      accept="image/*,video/*"
                      onChange={handleFileChange}
                    />
                    <button type="button" onClick={() => fileInputRef.current?.click()} className="attach-btn" title="Add Photo/Video">
                      <FiImage size={24} color="#45BD62" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-actions edit-post-actions">
              <button className="btn btn-secondary" onClick={() => navigate(returnTo)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleSave} disabled={isSaving}>
                {isSaving ? "Saving..." : "Save changes"}
              </button>
            </div>
          </section>
        )}
      </main>

      <button
        className="fab fab-f"
        onClick={() => setShowGlobalMenu(true)}
        aria-label="Open menu"
        id="global-menu-fab"
      >
        <span className="fab-f-letter">F</span>
      </button>

      <GlobalMenu isOpen={showGlobalMenu} onClose={() => setShowGlobalMenu(false)} onCreatePost={openCreatePost} />
    </div>
  );
}
