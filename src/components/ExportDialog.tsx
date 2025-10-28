import { useVideoStore } from "../store/useVideoStore";
import { ipcClient } from "../services/ipcClient";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Progress } from "./ui/progress";
import { useState, useEffect } from "react";

export function ExportDialog() {
  const {
    videoPath,
    videoMetadata,
    startTime,
    endTime,
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
      setProgress(progressData.progress || 0);
    };

    if (isProcessing) {
      ipcClient.onProgress(handleProgress);
    }

    return () => {
      ipcClient.offProgress(handleProgress);
    };
  }, [isProcessing, setProgress]);

  const canExport =
    videoPath &&
    videoMetadata &&
    startTime < endTime &&
    endTime <= videoMetadata.duration;

  const handleExport = async () => {
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
      } else {
        setExportStatus("error");
        setErrorMessage(result.error || "Export failed");
      }
    } catch (error) {
      setExportStatus("error");
      setErrorMessage(error instanceof Error ? error.message : "Unknown error");
    } finally {
      setProcessing(false);
    }
  };

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
            Resolution: {videoMetadata?.width} × {videoMetadata?.height}
          </p>
        </div>

        {/* Progress bar */}
        {isProcessing && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Exporting...</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="w-full" />
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
