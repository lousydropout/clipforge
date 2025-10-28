import { useVideoStore } from "./store/useVideoStore";
import { ipcClient } from "./services/ipcClient";
import { VideoPlayer } from "./components/VideoPlayer";
import { TrimControls } from "./components/TrimControls";
import { ExportDialog } from "./components/ExportDialog";
import { Button } from "./components/ui/button";
import { useState } from "react";
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
      } else {
        setError(result.error || "Failed to import video");
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unknown error");
    } finally {
      setIsImporting(false);
    }
  };

  const handleReset = () => {
    reset();
    setError("");
  };

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
              >
                {isImporting
                  ? "Importing..."
                  : videoPath
                  ? "Import New Video"
                  : "Import Video"}
              </Button>
              {videoPath && (
                <Button onClick={handleReset} variant="outline">
                  Reset
                </Button>
              )}
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
    </div>
  );
}

export default App;
