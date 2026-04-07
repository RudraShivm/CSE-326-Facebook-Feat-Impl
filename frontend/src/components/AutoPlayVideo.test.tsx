import { act, render, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AuthProvider } from "../contexts/AuthContext";
import { VideoPlaybackProvider } from "../contexts/VideoPlaybackContext";
import AutoPlayVideo from "./AutoPlayVideo";

declare global {
  interface Window {
    IntersectionObserver: any;
  }
}

describe("AutoPlayVideo", () => {
  it("autoplays only one visible video at a time and shares mute state", async () => {
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
    const { container } = render(
      <AuthProvider>
        <VideoPlaybackProvider>
          <div>
            <AutoPlayVideo src="https://example.com/one.mp4" autoPlayWhenVisible />
            <AutoPlayVideo src="https://example.com/two.mp4" autoPlayWhenVisible />
          </div>
        </VideoPlaybackProvider>
      </AuthProvider>
    );

    const videos = Array.from(container.querySelectorAll("video"));
    const [firstVideo, secondVideo] = videos;
    const [firstObserver, secondObserver] = window.IntersectionObserver.instances;
    const playSpy = HTMLMediaElement.prototype.play as unknown as ReturnType<typeof vi.fn>;
    const pauseSpy = HTMLMediaElement.prototype.pause as unknown as ReturnType<typeof vi.fn>;

    await act(async () => {
      firstObserver.trigger(firstVideo, true, 0.75);
    });
    await waitFor(() => expect(playSpy).toHaveBeenCalled());

    Object.defineProperty(firstVideo, "muted", { configurable: true, writable: true, value: false });
    await act(async () => {
      firstVideo.dispatchEvent(new Event("volumechange", { bubbles: true }));
    });
    expect(secondVideo).not.toHaveAttribute("muted");

    await act(async () => {
      secondObserver.trigger(secondVideo, true, 0.75);
    });
    await waitFor(() => expect(pauseSpy).toHaveBeenCalled());
    await waitFor(() => expect(playSpy).toHaveBeenCalledTimes(2));
  });
});
