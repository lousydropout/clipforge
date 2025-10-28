import { useVideoStore } from "../store/useVideoStore";
import { Card, CardContent } from "./ui/card";
import { useEffect, useRef, useState } from "react";

export function VideoPlayer() {
  const { videoPath, videoMetadata } = useVideoStore();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isLoading, setIsLoading] = useState(true);

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

  if (!videoPath) {
    return (
      <Card className="w-full">
        <CardContent className="flex items-center justify-center h-64 bg-muted/50">
          <div className="text-center">
            <div className="text-4xl mb-2">🎬</div>
            <p className="text-muted-foreground">No video selected</p>
            <p className="text-sm text-muted-foreground">
              Click "Import Video" to get started
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
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
            className="w-full h-64 object-contain bg-black rounded-t-lg"
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
          <div className="p-4 space-y-1">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Duration: {formatTime(videoMetadata.duration)}</span>
              <span>
                {videoMetadata.width} × {videoMetadata.height}
              </span>
            </div>
            <div className="text-sm text-muted-foreground">
              Format: {videoMetadata.format}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

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
