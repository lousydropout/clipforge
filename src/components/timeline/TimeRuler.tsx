import { useMemo } from "react";

interface TimeRulerProps {
  duration: number;
  pixelsPerSecond: number;
  width: number;
}

export function TimeRuler({
  duration,
  pixelsPerSecond,
  width,
}: TimeRulerProps) {
  const timeMarkers = useMemo(() => {
    if (duration <= 0) return [];

    const markers = [];
    const interval = duration > 60 ? 10 : 5; // 10 seconds for long videos, 5 for short

    for (let time = 0; time <= duration; time += interval) {
      const position = (time / duration) * width;
      markers.push({
        time,
        position,
        isMajor: time % (interval * 6) === 0, // Major markers every minute
      });
    }

    return markers;
  }, [duration, width]);

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
    <div className="relative h-8 bg-gray-800 border-b border-gray-700">
      {timeMarkers.map((marker) => (
        <div
          key={marker.time}
          className="absolute top-0 h-full flex flex-col"
          style={{ left: `${marker.position}px` }}
        >
          {/* Tick mark */}
          <div
            className={`w-px ${
              marker.isMajor ? "h-6 bg-gray-400" : "h-4 bg-gray-500"
            }`}
          />
          {/* Time label */}
          <div className="text-xs text-gray-400 mt-1 -ml-2">
            {formatTime(marker.time)}
          </div>
        </div>
      ))}
    </div>
  );
}
