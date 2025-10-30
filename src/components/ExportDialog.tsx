import { useProjectStore } from "../store/useProjectStore";
import { ipcClient } from "../services/ipcClient";
import { Button } from "./ui/button";
import { Progress } from "./ui/progress";
import { useState, useEffect, useCallback, useMemo } from "react";
import { toast } from "sonner";

export function ExportDialog() {
  const project = useProjectStore((state) => state.project);
  const videoPath = project?.mainTrack?.path;
  const videoMetadata = project?.mainTrack?.metadata;
  const startTime = project?.mainTrack?.startTime || 0;
  const endTime = project?.mainTrack?.endTime || 0;
  const isProcessing = useProjectStore((state) => state.isProcessing);
  const progress = useProjectStore((state) => state.progress);
  const setProcessing = useProjectStore((state) => state.setProcessing);
  const setProgress = useProjectStore((state) => state.setProgress);
  const playbackSpeed = useProjectStore((state) => state.playbackSpeed);
  const exportResolutionScale = useProjectStore((state) => state.exportResolutionScale);

  const [exportStatus, setExportStatus] = useState<
    "idle" | "success" | "error"
  >("idle");
  const [errorMessage, setErrorMessage] = useState("");

  // Listen to FFmpeg progress updates
  useEffect(() => {
    const handleProgress = (progressData: any) => {
      console.log("Received progress update in renderer:", progressData);
      setProgress(progressData.progress || 0);
    };

    if (isProcessing) {
      console.log("Setting up progress listener");
      ipcClient.onProgress(handleProgress);
    }

    return () => {
      console.log("Cleaning up progress listener");
      ipcClient.offProgress(handleProgress);
    };
  }, [isProcessing, setProgress]);

  const canExport = useMemo(
    () =>
      videoPath &&
      videoMetadata &&
      startTime < endTime &&
      endTime <= videoMetadata.duration,
    [videoPath, videoMetadata, startTime, endTime]
  );

  const handleExport = useCallback(async () => {
    if (!videoPath || !videoMetadata) return;

    setProcessing(true);
    setProgress(0);
    setExportStatus("idle");
    setErrorMessage("");

    try {
      // Get fresh values from store right before export
      const currentSpeed = useProjectStore.getState().playbackSpeed;
      const resolutionScale = useProjectStore.getState().exportResolutionScale;
      
      // Pass scaleFactor for proportional scaling
      const scaleFactor = resolutionScale < 1.0 ? resolutionScale : undefined;

      const result = await ipcClient.exportVideo({
        inputPath: videoPath,
        startTime,
        endTime,
        scaleFactor,
        playbackSpeed: currentSpeed,
      });

      if (result.success) {
        setExportStatus("success");
        setProgress(100);
        toast.success("Video exported successfully!");
      } else if (result.cancelled) {
        // User cancelled the export - don't show as error
        setExportStatus("idle");
        setProgress(0);
        setErrorMessage("");
      } else {
        setExportStatus("error");
        const errorMsg = result.error || "Export failed";
        setErrorMessage(errorMsg);
        toast.error(errorMsg);
      }
    } catch (error) {
      setExportStatus("error");
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      setErrorMessage(errorMsg);
      toast.error(errorMsg);
    } finally {
      setProcessing(false);
    }
  }, [
    videoPath,
    videoMetadata,
    startTime,
    endTime,
    setProcessing,
    setProgress,
  ]);

  const handleReset = () => {
    setExportStatus("idle");
    setErrorMessage("");
    setProgress(0);
  };

  if (!videoPath) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Export info */}
      <div className="text-sm text-gray-300">
        <p>Duration: {formatTime((endTime - startTime) / playbackSpeed)}</p>
        <p>
          Resolution: {Math.round((videoMetadata?.width || 0) * exportResolutionScale)} × {Math.round((videoMetadata?.height || 0) * exportResolutionScale)}
          {exportResolutionScale < 1.0 && (
            <span className="text-gray-400"> ({Math.round(exportResolutionScale * 100)}%)</span>
          )}
        </p>
      </div>

      {/* Progress bar */}
      {isProcessing && (
        <div className="space-y-3">
          <div className="flex justify-between text-sm text-gray-300">
            <span>Exporting...</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="w-full" />

          {/* Progress information */}
          <div className="text-xs text-gray-400">
            <div>
              <span className="font-medium">Progress:</span>{" "}
              {Math.round(progress)}% of {formatTime(endTime - startTime)}{" "}
              trimmed video
            </div>
          </div>
        </div>
      )}

      {/* Status messages */}
      {exportStatus === "success" && (
        <div className="p-3 bg-green-900/20 border border-green-700 rounded-md">
          <p className="text-sm text-green-400">
            ✅ Video exported successfully!
          </p>
        </div>
      )}

      {exportStatus === "error" && (
        <div className="p-3 bg-red-900/20 border border-red-700 rounded-md">
          <p className="text-sm text-red-400">
            ❌ Export failed: {errorMessage}
          </p>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2">
        <Button
          onClick={handleExport}
          disabled={!canExport || isProcessing}
          className="flex-1 bg-gray-600 text-white hover:bg-gray-500"
          data-export-button
          aria-label={isProcessing ? "Exporting video..." : "Export video"}
        >
          {isProcessing ? "Exporting..." : "Export Video"}
        </Button>

        {(exportStatus === "success" || exportStatus === "error") && (
          <Button onClick={handleReset} variant="outline">
            Reset
          </Button>
        )}
      </div>

      {/* Validation message */}
      {!canExport && videoPath && (
        <div className="text-sm text-red-400">
          {!videoMetadata
            ? "Video metadata not available"
            : startTime >= endTime
            ? "Start time must be less than end time"
            : "End time cannot exceed video duration"}
        </div>
      )}
    </div>
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
