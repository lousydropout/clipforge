import { useProjectStore } from "../store/useProjectStore";
import { VideoPlayerWithControls, VideoPlayerWithControlsRef } from "./VideoPlayerWithControls";
import { Timeline } from "./timeline/Timeline";
import { SettingsPanel } from "./SettingsPanel";
import { Button } from "./ui/button";
import { useEffect, useRef } from "react";
import { Toaster, toast } from "sonner";
import { Separator } from "./ui/separator";

interface ImportVideoEditorProps {
  onBackToWelcome: () => void;
}

export function ImportVideoEditor({ onBackToWelcome }: ImportVideoEditorProps) {
  const { project, reset } = useProjectStore();
  const videoPath = project?.mainTrack?.path;
  const videoPlayerRef = useRef<VideoPlayerWithControlsRef>(null);

  const handleReset = () => {
    reset();
    toast.info("Reset to start over");
  };

  const handleTimelineSeek = (time: number) => {
    videoPlayerRef.current?.seekTo(time);
  };

  const handleBackToWelcome = () => {
    reset();
    onBackToWelcome();
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
            <div className="flex items-center gap-4">
              <Button
                onClick={handleBackToWelcome}
                variant="ghost"
                size="sm"
                className="text-gray-300 hover:text-white"
              >
                ← Back to Welcome
              </Button>
              <h1 className="text-2xl font-bold text-white">Import Video Editor</h1>
            </div>
            <div className="flex gap-2">
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
          <VideoPlayerWithControls ref={videoPlayerRef} />

          {/* Timeline and Settings - Only show when video is loaded */}
          {videoPath && (
            <>
              <Separator className="bg-gray-700" />
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
            </>
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
