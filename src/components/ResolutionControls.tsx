import { Slider } from "./ui/slider";
import { useProjectStore } from "../store/useProjectStore";

export function ResolutionControls() {
  const project = useProjectStore((state) => state.project);
  const videoMetadata = project?.mainTrack?.metadata;
  const playbackSpeed = useProjectStore((state) => state.playbackSpeed);
  const setPlaybackSpeed = useProjectStore((state) => state.setPlaybackSpeed);
  const exportResolutionScale = useProjectStore((state) => state.exportResolutionScale);
  const setExportResolutionScale = useProjectStore((state) => state.setExportResolutionScale);

  // Calculate scaled resolution
  const scaledWidth = videoMetadata ? Math.round(videoMetadata.width * exportResolutionScale) : 0;
  const scaledHeight = videoMetadata ? Math.round(videoMetadata.height * exportResolutionScale) : 0;

  if (!videoMetadata) {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <div className="h-4 bg-gray-700 rounded animate-pulse"></div>
          <div className="h-10 bg-gray-700 rounded animate-pulse"></div>
          <div className="h-4 bg-gray-700 rounded animate-pulse w-32"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Playback Speed Slider (existing) */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm text-gray-300">
          <span>Playback Speed</span>
          <span>{playbackSpeed}x</span>
        </div>
        <Slider
          value={[playbackSpeed]}
          onValueChange={([value]) => setPlaybackSpeed(value)}
          min={0.5}
          max={2}
          step={0.1}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-gray-400">
          <span>0.5x</span>
          <span>2x</span>
        </div>
      </div>

      {/* Resolution Scale Slider (new) */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm text-gray-300">
          <span>Export Resolution</span>
          <span>{Math.round(exportResolutionScale * 100)}%</span>
        </div>
        <Slider
          value={[exportResolutionScale]}
          onValueChange={([value]) => setExportResolutionScale(value)}
          min={0.25}
          max={1.0}
          step={0.05}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-gray-400">
          <span>25%</span>
          <span>100%</span>
        </div>
        {videoMetadata && (
          <div className="text-xs text-gray-400 text-center">
            {scaledWidth} × {scaledHeight}
          </div>
        )}
      </div>
    </div>
  );
}
