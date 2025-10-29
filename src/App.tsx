import { useProjectStore } from "./store/useProjectStore";
import { ipcClient } from "./services/ipcClient";
import { VideoPlayer, VideoPlayerRef } from "./components/VideoPlayer";
import { Timeline } from "./components/timeline/Timeline";
import { SettingsPanel } from "./components/SettingsPanel";
import { Button } from "./components/ui/button";
import { useState, useEffect, useRef } from "react";
import { Toaster, toast } from "sonner";
import "./App.css";

function App() {
  const { project, setMainTrack, reset } = useProjectStore();
  const videoPath = project?.mainTrack?.path;
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState("");
  const videoPlayerRef = useRef<VideoPlayerRef>(null);

  const handleImportVideo = async () => {
    setIsImporting(true);
    setError("");

    try {
      const result = await ipcClient.importVideo();

      if (result.success && result.videoPath) {
        setMainTrack({
          id: "main-1",
          source: "imported",
          path: result.videoPath,
          metadata: result.metadata || null,
          startTime: 0,
          endTime: result.metadata?.duration || 0
        });
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

  const handleTimelineSeek = (time: number) => {
    videoPlayerRef.current?.seekTo(time);
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
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="border-b border-gray-700 bg-gray-800">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-white">ClipForge</h1>
            <div className="flex gap-2">
              <Button
                onClick={handleImportVideo}
                disabled={isImporting}
                variant="secondary"
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
                  variant="secondary"
                  title="Reset to start over"
                >
                  Reset
                </Button>
              )}
              <Button
                variant="secondary"
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
        <div className="space-y-6">
          {/* Error Display */}
          {error && (
            <div className="p-4 bg-red-900/20 border border-red-700 rounded-md">
              <p className="text-red-400">{error}</p>
            </div>
          )}

          {/* Video Player */}
          <VideoPlayer ref={videoPlayerRef} />

          {/* Timeline and Settings - Only show when video is loaded */}
          {videoPath && (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Timeline - Takes up most of the space */}
              <div className="lg:col-span-3">
                <Timeline onSeek={handleTimelineSeek} />
              </div>

              {/* Settings Panel - Right sidebar */}
              <div className="lg:col-span-1">
                <SettingsPanel />
              </div>
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
