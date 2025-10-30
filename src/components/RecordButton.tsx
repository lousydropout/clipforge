import { Button } from "./ui/button";
import { Circle, Square } from "lucide-react";

interface RecordButtonProps {
  isRecording: boolean;
  hasSelectedSource: boolean;
  onStartRecording: () => void;
  onStopRecording: () => void;
  disabled?: boolean;
}

export function RecordButton({ 
  isRecording, 
  hasSelectedSource, 
  onStartRecording, 
  onStopRecording, 
  disabled 
}: RecordButtonProps) {
  if (isRecording) {
    return (
      <Button
        onClick={onStopRecording}
        disabled={disabled}
        variant="destructive"
        className="flex items-center gap-2"
      >
        <Square className="h-4 w-4" />
        Stop Recording
      </Button>
    );
  }

  if (!hasSelectedSource) {
    return (
      <Button
        disabled
        variant="secondary"
        className="flex items-center gap-2"
      >
        <Circle className="h-4 w-4" />
        Select Screen Source
      </Button>
    );
  }

  return (
    <Button
      onClick={onStartRecording}
      disabled={disabled}
      variant="default"
      className="flex items-center gap-2"
    >
      <Circle className="h-4 w-4" />
      Start Recording
    </Button>
  );
}
