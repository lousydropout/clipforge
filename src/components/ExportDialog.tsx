import { useVideoStore } from "../store/useVideoStore";
import { ipcClient } from "../services/ipcClient";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Progress } from "./ui/progress";
import { useState, useEffect, useCallback, useMemo } from "react";
import { toast } from "sonner";

export function ExportDialog() {
  const {
    videoPath,
    videoMetadata,
    startTime,
    endTime,
    outputResolutionPercent,
    isProcessing,
    progress,
    setProcessing,
    setProgress,
  } = useVideoStore();

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

  const scaleToHeight = useMemo(() => {
    if (!videoMetadata || outputResolutionPercent === 100) return undefined;
    return Math.round(videoMetadata.height * (outputResolutionPercent / 100));
  }, [videoMetadata, outputResolutionPercent]);

  const handleExport = useCallback(async () => {
    if (!videoPath || !videoMetadata) return;

    setProcessing(true);
    setProgress(0);
    setExportStatus("idle");
    setErrorMessage("");

    try {
      const result = await ipcClient.exportVideo({
        inputPath: videoPath,
        startTime,
        endTime,
        scaleToHeight: videoMetadata.height > 720 ? 720 : undefined, // Scale down if > 720p
      });

      if (result.success) {
        setExportStatus("success");
        setProgress(100);
        toast.success("Video exported successfully!");
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
    scaleToHeight,
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
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Export Video</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Export info */}
        <div className="text-sm text-muted-foreground">
          <p>Duration: {formatTime(endTime - startTime)}</p>
          <p>
            Resolution:{" "}
            {outputResolutionPercent === 100
              ? `${videoMetadata?.width} × ${videoMetadata?.height}`
              : `${Math.round(
                  (videoMetadata?.width || 0) * (outputResolutionPercent / 100)
                )} × ${Math.round(
                  (videoMetadata?.height || 0) * (outputResolutionPercent / 100)
                )} (${outputResolutionPercent}%)`}
          </p>
        </div>

        {/* Progress bar */}
        {isProcessing && (
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span>Exporting...</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="w-full" />

            {/* Progress information */}
            <div className="text-xs text-muted-foreground">
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
          <div className="p-3 bg-green-50 border border-green-200 rounded-md">
            <p className="text-sm text-green-800">
              ✅ Video exported successfully!
            </p>
          </div>
        )}

        {exportStatus === "error" && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-800">
              ❌ Export failed: {errorMessage}
            </p>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-2">
          <Button
            onClick={handleExport}
            disabled={!canExport || isProcessing}
            className="flex-1"
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
          <div className="text-sm text-destructive">
            {!videoMetadata
              ? "Video metadata not available"
              : startTime >= endTime
              ? "Start time must be less than end time"
              : "End time cannot exceed video duration"}
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
