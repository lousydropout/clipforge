import { useProjectStore } from "../store/useProjectStore";
import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import {
  useEffect,
  useRef,
  useState,
  forwardRef,
  useImperativeHandle,
} from "react";
import { Video } from "lucide-react";
import { toast } from "sonner";
import { ipcClient } from "../services/ipcClient";

export interface VideoPlayerWithControlsRef {
  seekTo: (time: number) => void;
  getCurrentTime: () => number;
}

interface VideoPlayerWithControlsProps {
  previewStream?: MediaStream | null;
}

export const VideoPlayerWithControls = forwardRef<VideoPlayerWithControlsRef, VideoPlayerWithControlsProps>(
  ({ previewStream }, ref) => {
  const project = useProjectStore((state) => state.project);
  const videoPath = project?.mainTrack?.path;
  const videoMetadata = project?.mainTrack?.metadata;
  const setCurrentTime = useProjectStore((state) => state.setCurrentTime);
  const playbackSpeed = useProjectStore((state) => state.playbackSpeed);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const previewRef = useRef<HTMLVideoElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState("");

  useImperativeHandle(ref, () => ({
    seekTo: (time: number) => {
      if (videoRef.current) {
        videoRef.current.currentTime = time;
      }
    },
    getCurrentTime: () => {
      return videoRef.current?.currentTime || 0;
    },
  }));

  // Handle video loading
  useEffect(() => {
    if (videoPath) {
      setIsLoading(true);
      setError("");
    }
  }, [videoPath]);

  // Handle preview stream
  useEffect(() => {
    if (previewRef.current && previewStream) {
      previewRef.current.srcObject = previewStream;
    } else if (previewRef.current) {
      previewRef.current.srcObject = null;
    }
  }, [previewStream]);


  const handleVideoLoad = () => {
    setIsLoading(false);
    setError("");
    // Explicitly enable audio and set volume to maximum
    if (videoRef.current) {
      videoRef.current.muted = false;
      videoRef.current.volume = 1.0;
      console.log("VideoPlayerWithControls: Audio enabled, volume set to 1.0");
    }
  };

  const handleVideoError = () => {
    setIsLoading(false);
    setError("Failed to load video");
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleImportVideo = async () => {
    try {
      setIsImporting(true);
      const result = await ipcClient.importVideo();

      if (result.success && result.videoPath && result.metadata) {
        // Update main track with imported video
        useProjectStore.getState().setMainTrack({
          id: "main-1",
          source: "imported",
          path: result.videoPath,
          metadata: result.metadata,
          startTime: 0,
          endTime: result.metadata.duration,
        });
        toast.success("Video imported successfully");
      } else {
        throw new Error(result.error || "Failed to import video");
      }
    } catch (error) {
      console.error("Failed to import video:", error);
      toast.error(error instanceof Error ? error.message : "Failed to import video");
    } finally {
      setIsImporting(false);
    }
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Card className="w-full">
      <CardContent className="p-6">
        <div className="space-y-4">
          {/* Video Player */}
          <div className="relative bg-black rounded-lg overflow-hidden">
            {previewStream ? (
        <div className="relative">
                <video
                  ref={previewRef}
                  autoPlay
                  muted
                  className="w-full h-auto max-h-[600px]"
                  style={{ 
                    filter: `brightness(${playbackSpeed === 0.5 ? 0.8 : 1})`,
                  }}
                />
                <div className="absolute top-4 left-4 bg-blue-600 text-white px-2 py-1 rounded text-sm font-medium">
                  LIVE PREVIEW
                </div>
              </div>
            ) : videoPath ? (
              <div className="relative">
                <video
                  ref={videoRef}
                  src={videoPath}
                  className="w-full h-auto max-h-[600px]"
                  controls
                  onLoadedData={handleVideoLoad}
                  onError={handleVideoError}
                  onTimeUpdate={handleTimeUpdate}
                  style={{ 
                    filter: `brightness(${playbackSpeed === 0.5 ? 0.8 : 1})`,
                  }}
                />
                {isLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
                    <div className="text-white">Loading video...</div>
            </div>
          )}
                {error && (
                  <div className="absolute inset-0 flex items-center justify-center bg-red-900 bg-opacity-50">
                    <div className="text-white text-center">
                      <p className="font-semibold">Error loading video</p>
                      <p className="text-sm">{error}</p>
        </div>
            </div>
          )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                <Video className="h-16 w-16 mb-4" />
                <p className="text-lg font-medium mb-2">No video loaded</p>
                <p className="text-sm text-center mb-4">
                  Import a video file or start recording to get started
                </p>
            <Button
              onClick={handleImportVideo}
              disabled={isImporting}
              className="flex items-center gap-2"
            >
              <Video className="h-4 w-4" />
              {isImporting ? "Importing..." : "Import Video"}
            </Button>
              </div>
            )}
          </div>

          {/* Video Info */}
          {videoMetadata && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-gray-400">Duration:</span>
                <div className="font-medium">
                  {formatDuration(videoMetadata.duration)}
                </div>
              </div>
              <div>
                <span className="text-gray-400">Resolution:</span>
                <div className="font-medium">
                {videoMetadata.width} × {videoMetadata.height}
                </div>
              </div>
              <div>
                <span className="text-gray-400">FPS:</span>
                <div className="font-medium">{videoMetadata.fps}</div>
              </div>
              <div>
                <span className="text-gray-400">Format:</span>
                <div className="font-medium uppercase">{videoMetadata.format}</div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
});