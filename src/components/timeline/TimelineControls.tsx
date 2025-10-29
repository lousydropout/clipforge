import { useProjectStore } from "../../store/useProjectStore";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { useState, useEffect, useMemo } from "react";

export function TimelineControls() {
  const { project, updateTrack, timelineZoom, setTimelineZoom } = useProjectStore();
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
      // Set default trim range to full video duration
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

  const handleZoomIn = () => {
    setTimelineZoom(Math.min(timelineZoom * 1.5, 10));
  };

  const handleZoomOut = () => {
    setTimelineZoom(Math.max(timelineZoom / 1.5, 0.1));
  };

  const handleZoomReset = () => {
    setTimelineZoom(1.0);
  };

  // Memoized validation
  const isValidRange = useMemo(
    () => startTime < endTime && endTime <= (videoMetadata?.duration || 0),
    [startTime, endTime, videoMetadata?.duration]
  );

  if (!videoMetadata) {
    return (
      <div className="p-4 bg-gray-800 border border-gray-700 rounded-lg">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="h-4 bg-gray-700 rounded animate-pulse"></div>
              <div className="h-10 bg-gray-700 rounded animate-pulse"></div>
            </div>
            <div className="space-y-2">
              <div className="h-4 bg-gray-700 rounded animate-pulse"></div>
              <div className="h-10 bg-gray-700 rounded animate-pulse"></div>
            </div>
          </div>
          <div className="flex gap-2">
            <div className="h-8 bg-gray-700 rounded animate-pulse w-16"></div>
            <div className="h-8 bg-gray-700 rounded animate-pulse w-16"></div>
            <div className="h-8 bg-gray-700 rounded animate-pulse w-16"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 bg-gray-800 border border-gray-700 rounded-lg">
      <div className="space-y-4">
        {/* Time inputs */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">
              Start Time
            </label>
            <Input
              value={startTimeInput}
              onChange={(e) => handleStartTimeChange(e.target.value)}
              placeholder="00:00"
              className={`bg-gray-700 border-gray-600 text-white ${
                !isValidRange ? "border-red-500" : ""
              }`}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">
              End Time
            </label>
            <Input
              value={endTimeInput}
              onChange={(e) => handleEndTimeChange(e.target.value)}
              placeholder="00:00"
              className={`bg-gray-700 border-gray-600 text-white ${
                !isValidRange ? "border-red-500" : ""
              }`}
            />
          </div>
        </div>

        {/* Zoom controls */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-300">Zoom:</span>
          <Button
            onClick={handleZoomOut}
            variant="outline"
            size="sm"
            className="bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
          >
            -
          </Button>
          <span className="text-sm text-gray-300 min-w-[60px] text-center">
            {Math.round(timelineZoom * 100)}%
          </span>
          <Button
            onClick={handleZoomIn}
            variant="outline"
            size="sm"
            className="bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
          >
            +
          </Button>
          <Button
            onClick={handleZoomReset}
            variant="outline"
            size="sm"
            className="bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
          >
            Reset
          </Button>
        </div>

        {/* Validation message */}
        {!isValidRange && (
          <div className="text-sm text-red-400">
            {startTime >= endTime
              ? "Start time must be less than end time"
              : "End time cannot exceed video duration"}
          </div>
        )}
      </div>
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
