import { useProjectStore } from "../store/useProjectStore";
import { Input } from "./ui/input";
import { Slider } from "./ui/slider";
import { useState, useEffect, useCallback, useMemo } from "react";

export function TrimControls() {
  const { project, updateTrack } = useProjectStore();
  const videoMetadata = project?.mainTrack?.metadata;
  const startTime = project?.mainTrack?.startTime || 0;
  const endTime = project?.mainTrack?.endTime || 0;

  const [startTimeInput, setStartTimeInput] = useState("00:00");
  const [endTimeInput, setEndTimeInput] = useState("00:00");

  // Update inputs when store values change
  useEffect(() => {
    setStartTimeInput(formatTime(startTime));
    setEndTimeInput(formatTime(endTime));
  }, [startTime, endTime]);

  // Update store when video metadata changes
  useEffect(() => {
    if (videoMetadata) {
      updateTrack("main", { endTime: videoMetadata.duration });
    }
  }, [videoMetadata, updateTrack]);

  const handleStartTimeChange = (value: string) => {
    setStartTimeInput(value);
    const seconds = parseTime(value);
    if (!isNaN(seconds)) {
      updateTrack("main", { startTime: seconds });
    }
  };

  const handleEndTimeChange = (value: string) => {
    setEndTimeInput(value);
    const seconds = parseTime(value);
    if (!isNaN(seconds)) {
      updateTrack("main", { endTime: seconds });
    }
  };

  // Debounced slider change handler
  const handleSliderChange = useCallback(
    (values: number[]) => {
      const [start, end] = values;
      updateTrack("main", { startTime: start, endTime: end });
    },
    [updateTrack]
  );

  // Memoized validation
  const isValidRange = useMemo(
    () => startTime < endTime && endTime <= (videoMetadata?.duration || 0),
    [startTime, endTime, videoMetadata?.duration]
  );

  const duration = videoMetadata?.duration || 0;

  // Keyboard shortcuts for trim adjustment
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!videoMetadata) return;

      const isShiftPressed = event.shiftKey;
      const step = isShiftPressed ? 10 : 1; // 10 seconds with Shift, 1 second without

      switch (event.key) {
        case "ArrowLeft":
          event.preventDefault();
          updateTrack("main", { startTime: Math.max(0, startTime - step) });
          break;
        case "ArrowRight":
          event.preventDefault();
          updateTrack("main", { startTime: Math.min(endTime - 0.1, startTime + step) });
          break;
        case "ArrowUp":
          event.preventDefault();
          updateTrack("main", { endTime: Math.min(videoMetadata.duration, endTime + step) });
          break;
        case "ArrowDown":
          event.preventDefault();
          updateTrack("main", { endTime: Math.max(startTime + 0.1, endTime - step) });
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [videoMetadata, startTime, endTime, updateTrack]);

  if (!videoMetadata) {
    return (
      <div className="space-y-4">
        {/* Skeleton loading */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="h-4 bg-muted rounded animate-pulse"></div>
            <div className="h-10 bg-muted rounded animate-pulse"></div>
          </div>
          <div className="space-y-2">
            <div className="h-4 bg-muted rounded animate-pulse"></div>
            <div className="h-10 bg-muted rounded animate-pulse"></div>
          </div>
        </div>
        <div className="space-y-2">
          <div className="h-4 bg-muted rounded animate-pulse w-20"></div>
          <div className="h-6 bg-muted rounded animate-pulse"></div>
          <div className="h-3 bg-muted rounded animate-pulse w-32"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Time inputs */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Start Time</label>
          <Input
            value={startTimeInput}
            onChange={(e) => handleStartTimeChange(e.target.value)}
            placeholder="00:00"
            className={!isValidRange ? "border-destructive" : ""}
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">End Time</label>
          <Input
            value={endTimeInput}
            onChange={(e) => handleEndTimeChange(e.target.value)}
            placeholder="00:00"
            className={!isValidRange ? "border-destructive" : ""}
          />
        </div>
      </div>

      {/* Timeline slider */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Timeline</label>
        <Slider
          value={[startTime, endTime]}
          onValueChange={handleSliderChange}
          max={duration}
          step={0.1}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{formatTime(startTime)}</span>
          <span>Duration: {formatTime(endTime - startTime)}</span>
          <span>{formatTime(endTime)}</span>
        </div>
      </div>

      {/* Validation message */}
      {!isValidRange && (
        <div className="text-sm text-destructive">
          {startTime >= endTime
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

function parseTime(timeString: string): number {
  const parts = timeString.split(":").map(Number);

  if (parts.length === 2) {
    // MM:SS format
    return parts[0] * 60 + parts[1];
  } else if (parts.length === 3) {
    // HH:MM:SS format
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }

  return NaN;
}
