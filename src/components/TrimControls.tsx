import { useVideoStore } from "../store/useVideoStore";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Slider } from "./ui/slider";
import { useState, useEffect } from "react";

export function TrimControls() {
  const { videoMetadata, startTime, endTime, setStartTime, setEndTime } =
    useVideoStore();

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
      setEndTime(videoMetadata.duration);
    }
  }, [videoMetadata, setEndTime]);

  const handleStartTimeChange = (value: string) => {
    setStartTimeInput(value);
    const seconds = parseTime(value);
    if (!isNaN(seconds)) {
      setStartTime(seconds);
    }
  };

  const handleEndTimeChange = (value: string) => {
    setEndTimeInput(value);
    const seconds = parseTime(value);
    if (!isNaN(seconds)) {
      setEndTime(seconds);
    }
  };

  const handleSliderChange = (values: number[]) => {
    const [start, end] = values;
    setStartTime(start);
    setEndTime(end);
  };

  const isValidRange =
    startTime < endTime && endTime <= (videoMetadata?.duration || 0);
  const duration = videoMetadata?.duration || 0;

  if (!videoMetadata) {
    return null;
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Trim Settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
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
