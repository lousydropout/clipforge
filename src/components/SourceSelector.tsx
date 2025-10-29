import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "./ui/dropdown-menu";
import { Camera, Monitor, X } from "lucide-react";

export type RecordingSource = "screen" | "camera" | "none";

interface SourceSelectorProps {
  selectedSource: RecordingSource;
  onSourceChange: (source: RecordingSource) => void;
  disabled?: boolean;
}

export function SourceSelector({ selectedSource, onSourceChange, disabled }: SourceSelectorProps) {
  const getSourceIcon = (source: RecordingSource) => {
    switch (source) {
      case "screen":
        return <Monitor className="h-4 w-4" />;
      case "camera":
        return <Camera className="h-4 w-4" />;
      case "none":
        return <X className="h-4 w-4" />;
    }
  };

  const getSourceLabel = (source: RecordingSource) => {
    switch (source) {
      case "screen":
        return "Screen";
      case "camera":
        return "Camera";
      case "none":
        return "None";
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          disabled={disabled}
          variant="outline"
          className="flex items-center gap-2"
        >
          {getSourceIcon(selectedSource)}
          {getSourceLabel(selectedSource)}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem
          onClick={() => onSourceChange("screen")}
          className="flex items-center gap-2"
        >
          <Monitor className="h-4 w-4" />
          Screen
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => onSourceChange("camera")}
          className="flex items-center gap-2"
        >
          <Camera className="h-4 w-4" />
          Camera
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => onSourceChange("none")}
          className="flex items-center gap-2"
        >
          <X className="h-4 w-4" />
          None
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
