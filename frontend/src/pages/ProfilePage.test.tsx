import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { AuthProvider } from "../contexts/AuthContext";
import { AppToastProvider } from "../contexts/AppToastContext";
import { CreatePostProvider } from "../contexts/CreatePostContext";
import type { Post } from "../api/posts";

const getProfileMock = vi.fn();
const getUserPostsMock = vi.fn();
const postCardSpy = vi.fn();

vi.mock("../api/users", async () => {
  const actual = await vi.importActual<typeof import("../api/users")>("../api/users");
  return {
    ...actual,
    getProfile: (...args: unknown[]) => getProfileMock(...args),
    getUserPosts: (...args: unknown[]) => getUserPostsMock(...args),
  };
});

vi.mock("../components/PostCard", () => ({
  default: (props: unknown) => {
    postCardSpy(props);
    return <div data-testid="profile-post-card" />;
  },
}));

import ProfilePage from "./ProfilePage";

const post: Post = {
  id: "post-1",
  content: "Video post",
  imageUrl: null,
  videoUrl: "https://example.com/video.mp4",
  visibility: "PUBLIC",
  likeCount: 0,
  commentCount: 0,
  shareCount: 0,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  authorId: "user-1",
  author: {
    id: "user-1",
    firstName: "Owner",
    lastName: "User",
    profilePicture: null,
  },
};

describe("ProfilePage", () => {
  it("enables autoplay for videos in the profile post list", async () => {
    localStorage.setItem(
      "user",
      JSON.stringify({
        userId: "user-1",
        firstName: "Owner",
        lastName: "User",
        profilePicture: null,
        isActive: true,
      })
    );
    getProfileMock.mockResolvedValue({
      id: "user-1",
      firstName: "Owner",
      lastName: "User",
      profilePicture: null,
      coverPhoto: null,
      bio: null,
      jobStatus: null,
      relationshipStatus: null,
      instagramLink: null,
      linkedinLink: null,
      privacyFuturePosts: "PUBLIC",
      privacyFriendRequests: "PUBLIC",
      privacyFriendsList: "PUBLIC",
      createdAt: new Date().toISOString(),
    });
    getUserPostsMock.mockResolvedValue({
      posts: [post],
      nextCursor: null,
      hasMore: false,
    });

    render(
      <AuthProvider>
        <AppToastProvider>
          <CreatePostProvider>
            <MemoryRouter initialEntries={["/profile/user-1"]}>
              <Routes>
                <Route path="/profile/:userId" element={<ProfilePage />} />
              </Routes>
            </MemoryRouter>
          </CreatePostProvider>
        </AppToastProvider>
      </AuthProvider>
    );

    await waitFor(() => expect(screen.getByTestId("profile-post-card")).toBeInTheDocument());
    expect(postCardSpy).toHaveBeenCalledWith(expect.objectContaining({ enableAutoplayVideo: true }));
  });
});
