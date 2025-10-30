import { useState } from "react";
import { Button } from "./ui/button";
import { FolderOpen, FileVideo } from "lucide-react";
import { ipcClient } from "../services/ipcClient";

interface ExportLocationSelectorProps {
  onLocationChange: (path: string | null) => void;
  disabled?: boolean;
}

export function ExportLocationSelector({ 
  onLocationChange, 
  disabled 
}: ExportLocationSelectorProps) {
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSelectLocation = async () => {
    try {
      setIsLoading(true);
      const result = await ipcClient.showSaveDialog({
        title: "Choose where to save your recording",
        defaultPath: `screen_recording_${Date.now()}.webm`,
        filters: [
          { name: "WebM Video", extensions: ["webm"] },
          { name: "All Files", extensions: ["*"] }
        ]
      });

      if (result && !result.canceled && result.filePath) {
        setSelectedPath(result.filePath);
        onLocationChange(result.filePath);
      }
    } catch (error) {
      console.error("Failed to select export location:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getDisplayPath = () => {
    if (!selectedPath) return "Choose save location...";
    const fileName = selectedPath.split('/').pop() || selectedPath.split('\\').pop();
    return fileName || selectedPath;
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        onClick={handleSelectLocation}
        disabled={disabled || isLoading}
        variant="outline"
        className="flex items-center gap-2 min-w-[200px] justify-start"
      >
        <FolderOpen className="h-4 w-4" />
        <span className="truncate">{getDisplayPath()}</span>
      </Button>
      
      {selectedPath && (
        <div className="flex items-center gap-1 text-sm text-gray-400">
          <FileVideo className="h-4 w-4" />
          <span>Ready</span>
        </div>
      )}
    </div>
  );
}
