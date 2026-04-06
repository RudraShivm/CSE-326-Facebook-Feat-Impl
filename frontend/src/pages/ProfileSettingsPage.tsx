import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { getProfile, updateProfile, UserProfile, UpdateProfileInput } from "../api/users";
import { getApiErrorMessage } from "../api/error";
import { uploadMedia } from "../api/storage";
import GlobalMenu from "../components/GlobalMenu";
import { useCreatePostAction } from "../hooks/useCreatePostAction";
import { FiSearch, FiBell, FiPlus, FiCamera, FiLoader } from "react-icons/fi";

const JOB_OPTIONS = ["Unemployed", "Student", "Employed", "Freelancer", "Self-employed", "Other"];
const RELATIONSHIP_OPTIONS = ["Single", "In a relationship", "Married", "Complicated", "Other"];
const MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024;

// ── Validation helpers ──
const INSTAGRAM_REGEX = /^(https?:\/\/)?(www\.)?instagram\.com\/[a-zA-Z0-9._]+\/?$/;
const LINKEDIN_REGEX = /^(https?:\/\/)?(www\.)?linkedin\.com\/in\/[a-zA-Z0-9._-]+\/?$/;

function validateInstagram(link: string): string | null {
  if (!link.trim()) return null; // empty is ok
  if (!INSTAGRAM_REGEX.test(link.trim())) {
    return "Must be a valid Instagram URL (e.g. instagram.com/username)";
  }
  return null;
}

function validateLinkedin(link: string): string | null {
  if (!link.trim()) return null;
  if (!LINKEDIN_REGEX.test(link.trim())) {
    return "Must be a valid LinkedIn URL (e.g. linkedin.com/in/username)";
  }
  return null;
}

export default function ProfileSettingsPage() {
  const { user, updateUserContext } = useAuth();
  const navigate = useNavigate();
  const openCreatePost = useCreatePostAction();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Global Menu state
  const [showGlobalMenu, setShowGlobalMenu] = useState(false);

  // Upload state
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  // Form fields
  const [bio, setBio] = useState("");
  const [jobStatus, setJobStatus] = useState("");
  const [relationshipStatus, setRelationshipStatus] = useState("");
  const [instagramLink, setInstagramLink] = useState("");
  const [linkedinLink, setLinkedinLink] = useState("");

  // Validation errors
  const [igError, setIgError] = useState<string | null>(null);
  const [liError, setLiError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        setIsLoading(true);
        setStatus(null);
        const data = await getProfile(user.userId);
        setProfile(data);
        setBio(data.bio || "");
        setJobStatus(data.jobStatus || "");
        setRelationshipStatus(data.relationshipStatus || "");
        setInstagramLink(data.instagramLink || "");
        setLinkedinLink(data.linkedinLink || "");
      } catch (err) {
        console.error("Failed to fetch profile:", err);
        setStatus({
          type: "error",
          message: getApiErrorMessage(err, "Failed to load your profile settings. Please refresh and try again."),
        });
      } finally {
        setIsLoading(false);
      }
    })();
  }, [user]);

  // ── Image upload handlers ──
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > MAX_UPLOAD_SIZE_BYTES) {
      setStatus({
        type: "error",
        message: "Profile picture must be 10 MB or smaller.",
      });
      if (avatarInputRef.current) avatarInputRef.current.value = "";
      return;
    }
    setIsUploadingAvatar(true);
    setStatus(null);
    try {
      const url = await uploadMedia(file);
      const updated = await updateProfile(user.userId, { profilePicture: url });
      setProfile(updated);
      updateUserContext({ profilePicture: url });
      setStatus({ type: "success", message: "Profile picture updated." });
    } catch (err) {
      console.error("Failed to upload profile picture:", err);
      setStatus({
        type: "error",
        message: getApiErrorMessage(err, "Failed to upload profile picture. Please try again."),
      });
    } finally {
      setIsUploadingAvatar(false);
      if (avatarInputRef.current) avatarInputRef.current.value = "";
    }
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > MAX_UPLOAD_SIZE_BYTES) {
      setStatus({
        type: "error",
        message: "Cover photo must be 10 MB or smaller.",
      });
      if (coverInputRef.current) coverInputRef.current.value = "";
      return;
    }
    setIsUploadingCover(true);
    setStatus(null);
    try {
      const url = await uploadMedia(file);
      const updated = await updateProfile(user.userId, { coverPhoto: url });
      setProfile(updated);
      setStatus({ type: "success", message: "Cover photo updated." });
    } catch (err) {
      console.error("Failed to upload cover photo:", err);
      setStatus({
        type: "error",
        message: getApiErrorMessage(err, "Failed to upload cover photo. Please try again."),
      });
    } finally {
      setIsUploadingCover(false);
      if (coverInputRef.current) coverInputRef.current.value = "";
    }
  };

  // ── Save handler ──
  const handleSave = async () => {
    // Validate links first
    const igErr = validateInstagram(instagramLink);
    const liErr = validateLinkedin(linkedinLink);
    setIgError(igErr);
    setLiError(liErr);
    if (igErr || liErr) return;

    if (!user) return;
    setIsSaving(true);
    setStatus(null);
    try {
      const formattedBio = bio ? bio.replace(/[\r\n]{2,}/g, '\n') : null;
      const input: UpdateProfileInput = {
        bio: formattedBio,
        jobStatus: jobStatus || null,
        relationshipStatus: relationshipStatus || null,
        instagramLink: instagramLink || null,
        linkedinLink: linkedinLink || null,
      };
      const updated = await updateProfile(user.userId, input);
      setProfile(updated);
      setStatus({ type: "success", message: "Changes saved!" });
    } catch (err) {
      console.error("Failed to save profile:", err);
      setStatus({
        type: "error",
        message: getApiErrorMessage(err, "Failed to save profile. Please try again."),
      });
    } finally {
      setIsSaving(false);
    }
  };

  const initials = user ? `${user.firstName[0]}${user.lastName[0]}` : "?";

  return (
    <div className="settings-page">
      {/* ── Header ── */}
      <header className="feed-header">
        <h1 className="logo logo-small" onClick={() => navigate("/feed")} style={{ cursor: "pointer" }}>Facebook</h1>
        <div className="feed-header-right">
          <button className="header-icon-btn" onClick={() => navigate("/search")}><FiSearch size={20} /></button>
          <button className="header-icon-btn" onClick={() => navigate("/notifications")}>
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

      {/* ── Content ── */}
      <main className="settings-content">
        <h2 className="settings-page-title">Profile Settings</h2>
        {status && (
          <p className={`status-banner status-banner--${status.type}`}>
            {status.message}
          </p>
        )}

        {isLoading ? (
          <div className="skeleton-card card">
            <div className="skeleton-line" />
            <div className="skeleton-line skeleton-medium" />
          </div>
        ) : (
          <div className="settings-form-card">
            {/* Hidden file inputs */}
            <input
              type="file"
              accept="image/*"
              ref={avatarInputRef}
              style={{ display: "none" }}
              onChange={handleAvatarUpload}
            />
            <input
              type="file"
              accept="image/*"
              ref={coverInputRef}
              style={{ display: "none" }}
              onChange={handleCoverUpload}
            />

            {/* Profile Picture */}
            <div className="settings-avatar-section">
              <div className="settings-avatar">
                {profile?.profilePicture ? (
                  <img src={profile.profilePicture} alt="Profile" />
                ) : (
                  <span className="avatar-initials avatar-initials-lg">
                    {profile ? `${profile.firstName[0]}${profile.lastName[0]}` : "?"}
                  </span>
                )}
                <button
                  className="settings-avatar-edit-btn"
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={isUploadingAvatar}
                  title="Change profile picture"
                >
                  {isUploadingAvatar ? <FiLoader size={14} className="spin-icon" /> : <FiCamera size={14} />}
                </button>
              </div>
              {isUploadingAvatar && <span className="upload-hint">Uploading...</span>}
            </div>

            {/* Cover Photo */}
            <div className="settings-field">
              <label className="settings-label">Cover Photo</label>
              <div
                className="settings-cover-upload"
                onClick={() => !isUploadingCover && coverInputRef.current?.click()}
                style={{ cursor: isUploadingCover ? "wait" : "pointer" }}
              >
                {profile?.coverPhoto ? (
                  <img src={profile.coverPhoto} alt="Cover" className="settings-cover-preview" />
                ) : (
                  <div className="settings-cover-placeholder">
                    <span>{isUploadingCover ? "Uploading..." : "Tap to change cover"}</span>
                    {isUploadingCover ? <FiLoader size={20} className="spin-icon" /> : <FiPlus size={20} />}
                  </div>
                )}
                {isUploadingCover && profile?.coverPhoto && (
                  <div className="cover-uploading-overlay">
                    <FiLoader size={24} className="spin-icon" />
                  </div>
                )}
              </div>
            </div>

            {/* Bio */}
            <div className="settings-field">
              <label className="settings-label">Bio</label>
              <textarea
                className="settings-input settings-textarea"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Write something about yourself..."
                maxLength={300}
              />
            </div>

            {/* Job Status */}
            <div className="settings-field">
              <label className="settings-label">Job Status</label>
              <select
                className="settings-input settings-select"
                value={jobStatus}
                onChange={(e) => setJobStatus(e.target.value)}
              >
                <option value="">Select...</option>
                {JOB_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>

            {/* Relationship Status */}
            <div className="settings-field">
              <label className="settings-label">Relational Status</label>
              <select
                className="settings-input settings-select"
                value={relationshipStatus}
                onChange={(e) => setRelationshipStatus(e.target.value)}
              >
                <option value="">Select...</option>
                {RELATIONSHIP_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>

            {/* Social Links */}
            <div className="settings-field">
              <label className="settings-label">Links</label>
              <div className="settings-link-row">
                <input
                  className={`settings-input ${igError ? "settings-input-error" : ""}`}
                  value={instagramLink}
                  onChange={(e) => {
                    setInstagramLink(e.target.value);
                    if (igError) setIgError(null);
                  }}
                  placeholder="instagram.com/username"
                />
                <FiPlus size={18} className="settings-link-icon" />
              </div>
              {igError && <span className="settings-field-error">{igError}</span>}
              <div className="settings-link-row">
                <input
                  className={`settings-input ${liError ? "settings-input-error" : ""}`}
                  value={linkedinLink}
                  onChange={(e) => {
                    setLinkedinLink(e.target.value);
                    if (liError) setLiError(null);
                  }}
                  placeholder="linkedin.com/in/username"
                />
                <FiPlus size={18} className="settings-link-icon" />
              </div>
              {liError && <span className="settings-field-error">{liError}</span>}
            </div>

            {/* Save */}
            <button
              className="btn btn-primary settings-save-btn"
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        )}
      </main>

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
        onCreatePost={openCreatePost}
      />
    </div>
  );
}
