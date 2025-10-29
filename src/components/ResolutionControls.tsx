import { Slider } from "./ui/slider";
import { useVideoStore } from "../store/useVideoStore";

export function ResolutionControls() {
  const videoMetadata = useVideoStore((state) => state.videoMetadata);
  const outputResolutionPercent = useVideoStore(
    (state) => state.outputResolutionPercent
  );
  const setOutputResolutionPercent = useVideoStore(
    (state) => state.setOutputResolutionPercent
  );
  const playbackSpeed = useVideoStore((state) => state.playbackSpeed);
  const setPlaybackSpeed = useVideoStore((state) => state.setPlaybackSpeed);

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
      <div className="space-y-2">
        <div className="flex justify-between text-sm text-gray-300">
          <span>Resolution Scale</span>
          <span>{outputResolutionPercent}%</span>
        </div>
        <Slider
          value={[outputResolutionPercent]}
          onValueChange={([value]) => setOutputResolutionPercent(value)}
          min={25}
          max={100}
          step={5}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-gray-400">
          <span>25%</span>
          <span>100%</span>
        </div>
      </div>

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
    </div>
  );
}
