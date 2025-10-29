import { useRef, useState, useCallback, useEffect } from "react";
import { useProjectStore } from "../../store/useProjectStore";

interface VideoTrackProps {
  duration: number;
  width: number;
  onSeek?: (time: number) => void;
}

export function VideoTrack({ duration, width, onSeek }: VideoTrackProps) {
  const { project, updateTrack } = useProjectStore();
  const startTime = project?.mainTrack?.startTime || 0;
  const endTime = project?.mainTrack?.endTime || 0;
  const [isDragging, setIsDragging] = useState<"start" | "end" | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  const startPosition = (startTime / duration) * width;
  const endPosition = (endTime / duration) * width;
  const clipWidth = endPosition - startPosition;

  const handleMouseDown = useCallback(
    (e: React.MouseEvent, handle: "start" | "end") => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(handle);
    },
    []
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging || !trackRef.current) return;

      const rect = trackRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const time = Math.max(0, Math.min(duration, (x / width) * duration));

      if (isDragging === "start") {
        updateTrack("main", { startTime: Math.min(time, endTime - 0.1) });
      } else if (isDragging === "end") {
        updateTrack("main", { endTime: Math.max(time, startTime + 0.1) });
      }
    },
    [isDragging, duration, width, startTime, endTime, updateTrack]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(null);
  }, []);

  const handleTrackClick = useCallback(
    (e: React.MouseEvent) => {
      if (isDragging) return; // Don't seek if we're dragging a handle

      const rect = trackRef.current?.getBoundingClientRect();
      if (!rect) return;

      const x = e.clientX - rect.left;
      const time = Math.max(0, Math.min(duration, (x / width) * duration));

      onSeek?.(time);
    },
    [isDragging, duration, width]
  );

  // Add global mouse event listeners when dragging
  useEffect(() => {
    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${secs
        .toString()
        .padStart(2, "0")}`;
    }
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div
      ref={trackRef}
      className="relative h-16 bg-gray-900 border-b border-gray-700 cursor-pointer select-none"
      style={{ width: `${width}px` }}
      onClick={handleTrackClick}
    >
      {/* Video clip */}
      <div
        className="absolute top-2 bg-blue-600 rounded-sm flex items-center justify-center text-white text-sm font-medium opacity-50"
        style={{
          left: `${startPosition}px`,
          width: `${clipWidth}px`,
          height: `48px`,
        }}
      >
        <span className="truncate px-2">{formatTime(endTime - startTime)}</span>
      </div>

      {/* Start trim handle */}
      <div
        className={`absolute top-0 w-4 h-full cursor-ew-resize transition-colors z-20 ${
          isDragging === "start"
            ? "bg-blue-300 scale-110"
            : "bg-blue-400 hover:bg-blue-300"
        }`}
        style={{ left: `${startPosition - 8}px` }}
        onMouseDown={(e) => handleMouseDown(e, "start")}
      >
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-1 h-8 bg-white rounded-sm" />
      </div>

      {/* End trim handle */}
      <div
        className={`absolute top-0 w-4 h-full cursor-ew-resize transition-colors z-20 ${
          isDragging === "end"
            ? "bg-blue-300 scale-110"
            : "bg-blue-400 hover:bg-blue-300"
        }`}
        style={{ left: `${endPosition - 8}px` }}
        onMouseDown={(e) => handleMouseDown(e, "end")}
      >
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-1 h-8 bg-white rounded-sm" />
      </div>

      {/* Time labels */}
      <div
        className="absolute top-0 text-xs text-gray-400 -mt-5"
        style={{ left: `${startPosition}px` }}
      >
        {formatTime(startTime)}
      </div>
      <div
        className="absolute top-0 text-xs text-gray-400 -mt-5"
        style={{ left: `${endPosition}px` }}
      >
        {formatTime(endTime)}
      </div>
    </div>
  );
}
