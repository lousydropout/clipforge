import { Button } from "./ui/button";
import { Circle, Square } from "lucide-react";
import { RecordingSource } from "./SourceSelector";

interface RecordButtonProps {
  isRecording: boolean;
  selectedSource: RecordingSource;
  onStartRecording: () => void;
  onStopRecording: () => void;
  disabled?: boolean;
}

export function RecordButton({ 
  isRecording, 
  selectedSource, 
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

  if (selectedSource === "none") {
    return (
      <Button
        disabled
        variant="secondary"
        className="flex items-center gap-2"
      >
        <Circle className="h-4 w-4" />
        Select Source
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
