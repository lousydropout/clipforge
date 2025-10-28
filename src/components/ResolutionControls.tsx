import { Slider } from "./ui/slider";
import { useVideoStore } from "../store/useVideoStore";
import { useMemo } from "react";

export function ResolutionControls() {
  const { videoMetadata, outputResolutionPercent, setOutputResolutionPercent } =
    useVideoStore();

  const outputResolution = useMemo(() => {
    if (!videoMetadata) return { width: 0, height: 0 };

    const scale = outputResolutionPercent / 100;
    return {
      width: Math.round(videoMetadata.width * scale),
      height: Math.round(videoMetadata.height * scale),
    };
  }, [videoMetadata, outputResolutionPercent]);

  if (!videoMetadata) {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <div className="h-4 bg-muted rounded animate-pulse"></div>
          <div className="h-10 bg-muted rounded animate-pulse"></div>
          <div className="h-4 bg-muted rounded animate-pulse w-32"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
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
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>25%</span>
          <span>100%</span>
        </div>
      </div>

      <div className="text-sm text-muted-foreground">
        <div className="flex justify-between">
          <span>Original:</span>
          <span>
            {videoMetadata.width} × {videoMetadata.height}
          </span>
        </div>
        <div className="flex justify-between">
          <span>Output:</span>
          <span>
            {outputResolution.width} × {outputResolution.height}
          </span>
        </div>
      </div>
    </div>
  );
}
