import { useRef, useState, useCallback, useEffect } from "react";
import { useVideoStore } from "../../store/useVideoStore";

interface PlayheadProps {
  duration: number;
  width: number;
  onSeek?: (time: number) => void;
}

export function Playhead({ duration, width, onSeek }: PlayheadProps) {
  // Use selectors to ensure proper re-rendering when currentTime changes
  const currentTime = useVideoStore((state) => state.currentTime);
  const setCurrentTime = useVideoStore((state) => state.setCurrentTime);
  const [isDragging, setIsDragging] = useState(false);
  const playheadRef = useRef<HTMLDivElement>(null);

  const position = (currentTime / duration) * width;

  // Monitor currentTime changes for debugging
  useEffect(() => {
    // Debug logging removed for cleaner console
  }, [currentTime, position]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging || !playheadRef.current) return;

      // Get the timeline container (parent of the playhead)
      const timelineContainer = playheadRef.current.parentElement;
      if (!timelineContainer) return;

      const containerRect = timelineContainer.getBoundingClientRect();
      const x = e.clientX - containerRect.left;
      const time = Math.max(0, Math.min(duration, (x / width) * duration));

      // Update store and video immediately for responsive dragging
      setCurrentTime(time);
      onSeek?.(time);
    },
    [isDragging, duration, width, setCurrentTime, onSeek]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

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
      ref={playheadRef}
      className={`absolute top-0 w-1 h-full cursor-pointer z-10 ${
        isDragging
          ? "bg-red-400 scale-x-150"
          : "bg-red-500 hover:bg-red-400 transition-colors"
      }`}
      style={{ left: `${(currentTime / duration) * width}px` }}
      onMouseDown={handleMouseDown}
    >
      {/* Time tooltip - only show when dragging */}
      {isDragging && (
        <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap shadow-lg">
          {formatTime(currentTime)}
        </div>
      )}
    </div>
  );
}
