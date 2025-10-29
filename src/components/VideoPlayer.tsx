import { useVideoStore } from "../store/useVideoStore";
import { Card, CardContent } from "./ui/card";
import {
  useEffect,
  useRef,
  useState,
  forwardRef,
  useImperativeHandle,
} from "react";

export interface VideoPlayerRef {
  seekTo: (time: number) => void;
  getCurrentTime: () => number;
}

export const VideoPlayer = forwardRef<VideoPlayerRef>((_props, ref) => {
  const videoPath = useVideoStore((state) => state.videoPath);
  const videoMetadata = useVideoStore((state) => state.videoMetadata);
  const setCurrentTime = useVideoStore((state) => state.setCurrentTime);
  const playbackSpeed = useVideoStore((state) => state.playbackSpeed);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isLoading, setIsLoading] = useState(true);

  useImperativeHandle(ref, () => ({
    seekTo: (time: number) => {
      if (videoRef.current) {
        videoRef.current.currentTime = time;
        setCurrentTime(time);
      }
    },
    getCurrentTime: () => {
      return videoRef.current?.currentTime || 0;
    },
  }));

  // Keyboard shortcuts for video playback
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code === "Space" && videoRef.current) {
        event.preventDefault();
        if (videoRef.current.paused) {
          videoRef.current.play();
        } else {
          videoRef.current.pause();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Reset loading state when video path changes
  useEffect(() => {
    if (videoPath) {
      setIsLoading(true);
    }
  }, [videoPath]);

  // This useEffect is now handled by the second useEffect below

  // Attach event listeners when video element is ready
  useEffect(() => {
    const video = videoRef.current;

    if (!video) {
      return;
    }

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
    };

    const handleSeeked = () => {
      setCurrentTime(video.currentTime);
    };

    const handlePlay = () => {
      setCurrentTime(video.currentTime);
    };

    const handlePause = () => {
      setCurrentTime(video.currentTime);
    };

    // Simple polling mechanism for video time updates
    let pollInterval: NodeJS.Timeout;

    const startPolling = () => {
      pollInterval = setInterval(() => {
        if (video && !video.paused) {
          setCurrentTime(video.currentTime);
        }
      }, 100); // Update every 100ms
    };

    const stopPolling = () => {
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };

    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("seeked", handleSeeked);
    video.addEventListener("play", () => {
      handlePlay();
      startPolling();
    });
    video.addEventListener("pause", () => {
      handlePause();
      stopPolling();
    });

    return () => {
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("seeked", handleSeeked);
      video.removeEventListener("play", () => {
        handlePlay();
        startPolling();
      });
      video.removeEventListener("pause", () => {
        handlePause();
        stopPolling();
      });
      stopPolling();
    };
  }, [videoPath, setCurrentTime]);

  // Apply playback speed to video element
  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      video.playbackRate = playbackSpeed;
    }
  }, [playbackSpeed]);

  if (!videoPath) {
    return (
      <Card className="w-full bg-gray-800 border-gray-700">
        <CardContent className="flex items-center justify-center h-128 bg-gray-800">
          <div className="text-center">
            <div className="text-4xl mb-2">🎬</div>
            <p className="text-gray-300">No video selected</p>
            <p className="text-sm text-gray-400">
              Click "Import Video" to get started
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full bg-gray-800 border-gray-700">
      <CardContent className="p-0">
        <div className="relative">
          <video
            ref={videoRef}
            src={
              videoPath.startsWith("file://")
                ? videoPath
                : `file://${videoPath}`
            }
            controls
            className="w-full h-128 object-contain bg-black rounded-t-lg"
            preload="metadata"
            aria-label="Video player"
            onLoadedData={() => setIsLoading(false)}
            onError={() => setIsLoading(false)}
          >
            Your browser does not support the video tag.
          </video>

          {/* Loading skeleton */}
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-t-lg">
              <div className="flex items-center space-x-2 text-white">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                <span>Loading video...</span>
              </div>
            </div>
          )}
        </div>

        {videoMetadata && (
          <div className="p-4 space-y-1 bg-gray-800">
            <div className="flex justify-between text-sm text-gray-300">
              <span>Duration: {formatTime(videoMetadata.duration)}</span>
              <span>
                {videoMetadata.width} × {videoMetadata.height}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
});

VideoPlayer.displayName = "VideoPlayer";

function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  }
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}
