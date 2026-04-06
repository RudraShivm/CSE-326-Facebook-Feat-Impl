import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from "react";
import { useAuth } from "./AuthContext";

interface VideoPlaybackContextValue {
  activeVideoId: string | null;
  isMuted: boolean;
  requestPlayback: (videoId: string) => void;
  clearPlayback: (videoId: string) => void;
  setMuted: (muted: boolean) => void;
}

const VideoPlaybackContext = createContext<VideoPlaybackContextValue | undefined>(undefined);

export function VideoPlaybackProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const storageKey = user ? `facebook-video-muted:${user.userId}` : "facebook-video-muted:guest";
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(true);

  useEffect(() => {
    const stored = window.localStorage.getItem(storageKey);
    if (stored === null) {
      setIsMuted(true);
      return;
    }

    setIsMuted(stored === "true");
  }, [storageKey]);

  useEffect(() => {
    window.localStorage.setItem(storageKey, String(isMuted));
  }, [isMuted, storageKey]);

  const requestPlayback = useCallback((videoId: string) => {
    setActiveVideoId(videoId);
  }, []);

  const clearPlayback = useCallback((videoId: string) => {
    setActiveVideoId((current) => (current === videoId ? null : current));
  }, []);

  const value = useMemo(
    () => ({
      activeVideoId,
      isMuted,
      requestPlayback,
      clearPlayback,
      setMuted: setIsMuted,
    }),
    [activeVideoId, clearPlayback, isMuted, requestPlayback]
  );

  return <VideoPlaybackContext.Provider value={value}>{children}</VideoPlaybackContext.Provider>;
}

export function useVideoPlayback() {
  const context = useContext(VideoPlaybackContext);

  if (!context) {
    throw new Error("useVideoPlayback must be used within a VideoPlaybackProvider");
  }

  return context;
}
