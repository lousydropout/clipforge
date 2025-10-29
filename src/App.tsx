import { useProjectStore } from "./store/useProjectStore";
import { VideoPlayerWithControls, VideoPlayerWithControlsRef } from "./components/VideoPlayerWithControls";
import { Timeline } from "./components/timeline/Timeline";
import { SettingsPanel } from "./components/SettingsPanel";
import { RecordingControls } from "./components/RecordingControls";
import { Button } from "./components/ui/button";
import { useEffect, useRef, useState } from "react";
import { Toaster, toast } from "sonner";
import "./App.css";

function App() {
  const { project, reset } = useProjectStore();
  const videoPath = project?.mainTrack?.path;
  const videoPlayerRef = useRef<VideoPlayerWithControlsRef>(null);
  const [previewStream, setPreviewStream] = useState<MediaStream | null>(null);

  const handleReset = () => {
    reset();
    toast.info("Reset to start over");
  };

  const handleTimelineSeek = (time: number) => {
    videoPlayerRef.current?.seekTo(time);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
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
  }, [videoPath]);

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="border-b border-gray-700 bg-gray-800">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-white">ClipForge</h1>
            <div className="flex gap-2">
              <RecordingControls onPreviewStreamChange={setPreviewStream} />
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
                    "Keyboard shortcuts:\n• Ctrl+E: Export video\n• Space: Play/pause video\n• Arrow keys: Adjust trim markers\n• Shift+Arrow: Adjust by 10 seconds"
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
          {/* Video Player with Controls */}
          <VideoPlayerWithControls ref={videoPlayerRef} previewStream={previewStream} />

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
