import { useProjectStore } from "../../store/useProjectStore";
import { TimeRuler } from "./TimeRuler";
import { VideoTrack } from "./VideoTrack";
import { Playhead } from "./Playhead";
import { TimelineControls } from "./TimelineControls";
import { useMemo } from "react";

interface TimelineProps {
  onSeek?: (time: number) => void;
}

export function Timeline({ onSeek }: TimelineProps) {
  const { project, timelineZoom } = useProjectStore();
  const videoMetadata = project?.mainTrack?.metadata;

  // Base pixels per second for 100% zoom (shows full video)
  // For a 1-minute video, this gives us about 1200px width at 100% zoom
  const basePixelsPerSecond = 20;

  const pixelsPerSecond = useMemo(() => {
    if (!videoMetadata) return basePixelsPerSecond;
    return basePixelsPerSecond * timelineZoom;
  }, [videoMetadata, timelineZoom]);

  const timelineWidth = useMemo(() => {
    if (!videoMetadata) return 800;
    return Math.max(800, videoMetadata.duration * pixelsPerSecond);
  }, [videoMetadata, pixelsPerSecond]);

  if (!videoMetadata) {
    return (
      <div className="bg-gray-900 border border-gray-700 rounded-lg p-4">
        <div className="text-center text-gray-400">
          <div className="text-2xl mb-2">🎬</div>
          <p>Import a video to see the timeline</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Timeline Controls */}
      <TimelineControls />

      {/* Timeline Container */}
      <div className="bg-gray-900 border border-gray-700 rounded-lg overflow-x-auto">
        {/* Time Ruler */}
        <TimeRuler duration={videoMetadata.duration} width={timelineWidth} />

        {/* Video Track */}
        <div className="relative pb-4">
          <VideoTrack
            duration={videoMetadata.duration}
            width={timelineWidth}
            onSeek={onSeek}
          />

          {/* Playhead */}
          <Playhead
            duration={videoMetadata.duration}
            width={timelineWidth}
            onSeek={onSeek}
          />
        </div>
      </div>
    </div>
  );
}
