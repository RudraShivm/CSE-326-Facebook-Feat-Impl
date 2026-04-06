import { CSSProperties, useEffect, useId, useMemo, useRef, useState } from "react";
import { useVideoPlayback } from "../contexts/VideoPlaybackContext";

interface AutoPlayVideoProps {
  src: string;
  className?: string;
  style?: CSSProperties;
  autoPlayWhenVisible?: boolean;
  controls?: boolean;
}

export default function AutoPlayVideo({
  src,
  className,
  style,
  autoPlayWhenVisible = false,
  controls = true,
}: AutoPlayVideoProps) {
  const generatedId = useId();
  const videoId = useMemo(() => `video-${generatedId}`, [generatedId]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const { activeVideoId, isMuted, requestPlayback, clearPlayback, setMuted } = useVideoPlayback();

  useEffect(() => {
    if (!autoPlayWhenVisible || !videoRef.current) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        const visible = entry.isIntersecting && entry.intersectionRatio >= 0.6;
        setIsVisible(visible);

        if (visible) {
          requestPlayback(videoId);
        } else {
          clearPlayback(videoId);
        }
      },
      {
        threshold: [0.6],
      }
    );

    observer.observe(videoRef.current);
    return () => observer.disconnect();
  }, [autoPlayWhenVisible, clearPlayback, requestPlayback, videoId]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    video.muted = isMuted;
  }, [isMuted]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !autoPlayWhenVisible) {
      return;
    }

    if (activeVideoId === videoId && isVisible) {
      const playPromise = video.play();
      if (playPromise) {
        playPromise.catch(() => {});
      }
      return;
    }

    video.pause();
  }, [activeVideoId, autoPlayWhenVisible, isVisible, videoId]);

  return (
    <video
      ref={videoRef}
      src={src}
      className={className}
      style={style}
      controls={controls}
      playsInline
      muted={isMuted}
      onPlay={() => {
        if (autoPlayWhenVisible) {
          requestPlayback(videoId);
        }
      }}
      onVolumeChange={(event) => {
        setMuted(event.currentTarget.muted);
      }}
    />
  );
}
