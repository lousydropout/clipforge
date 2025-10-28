import { useVideoStore } from "./store/useVideoStore";
import { ipcClient } from "./services/ipcClient";
import { VideoPlayer } from "./components/VideoPlayer";
import { TrimControls } from "./components/TrimControls";
import { ResolutionControls } from "./components/ResolutionControls";
import { ExportDialog } from "./components/ExportDialog";
import { Button } from "./components/ui/button";
import { useState, useEffect } from "react";
import { Toaster, toast } from "sonner";
import "./App.css";

function App() {
  const { videoPath, setVideoPath, setVideoMetadata, reset } = useVideoStore();
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState("");

  const handleImportVideo = async () => {
    setIsImporting(true);
    setError("");

    try {
      const result = await ipcClient.importVideo();

      if (result.success && result.videoPath) {
        setVideoPath(result.videoPath);
        if (result.metadata) {
          setVideoMetadata(result.metadata);
        }
        toast.success("Video imported successfully!");
      } else {
        const errorMsg = result.error || "Failed to import video";
        setError(errorMsg);
        toast.error(errorMsg);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsImporting(false);
    }
  };

  const handleReset = () => {
    reset();
    setError("");
    toast.info("Reset to start over");
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl/Cmd + O - Import video
      if ((event.ctrlKey || event.metaKey) && event.key === "o") {
        event.preventDefault();
        if (!isImporting) {
          handleImportVideo();
        }
      }

      // Ctrl/Cmd + E - Export video (only when video is loaded)
      if ((event.ctrlKey || event.metaKey) && event.key === "e") {
        event.preventDefault();
        if (videoPath) {
          // Trigger export by simulating click on export button
          const exportButton = document.querySelector(
            "[data-export-button]"
          ) as HTMLButtonElement;
          if (exportButton && !exportButton.disabled) {
            exportButton.click();
          }
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isImporting, videoPath]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">ClipForge</h1>
            <div className="flex gap-2">
              <Button
                onClick={handleImportVideo}
                disabled={isImporting}
                variant={videoPath ? "outline" : "default"}
                title="Import a video file (Ctrl+O)"
              >
                {isImporting
                  ? "Importing..."
                  : videoPath
                  ? "Import New Video"
                  : "Import Video"}
              </Button>
              {videoPath && (
                <Button
                  onClick={handleReset}
                  variant="outline"
                  title="Reset to start over"
                >
                  Reset
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  toast.info(
                    "Keyboard shortcuts:\n• Ctrl+O: Import video\n• Ctrl+E: Export video\n• Space: Play/pause video\n• Arrow keys: Adjust trim markers\n• Shift+Arrow: Adjust by 10 seconds"
                  )
                }
                title="Show keyboard shortcuts"
              >
                Help
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Error Display */}
          {error && (
            <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-md">
              <p className="text-destructive">{error}</p>
            </div>
          )}

          {/* Video Player */}
          <VideoPlayer />

          {/* Trim Controls - Only show when video is loaded */}
          {videoPath && <TrimControls />}

          {/* Resolution Controls - Only show when video is loaded */}
          {videoPath && <ResolutionControls />}

          {/* Export Dialog - Only show when video is loaded */}
          {videoPath && <ExportDialog />}

          {/* Welcome Message - Only show when no video is loaded */}
          {!videoPath && (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🎬</div>
              <h2 className="text-2xl font-semibold mb-2">
                Welcome to ClipForge
              </h2>
              <p className="text-muted-foreground mb-6">
                Import a video file to start trimming and exporting clips
              </p>
              <Button onClick={handleImportVideo} size="lg">
                Get Started
              </Button>
            </div>
          )}
        </div>
      </main>

      {/* Toast notifications */}
      <Toaster
        position="bottom-right"
        richColors
        toastOptions={{
          duration: 4000,
          style: {
            cursor: "pointer",
          },
        }}
      />
    </div>
  );
}

export default App;
