import { useState, useEffect, useRef } from "react";
import { useProjectStore } from "../store/useProjectStore";
import { Circle } from "lucide-react";
import { toast } from "sonner";
import { ScreenRecorder, ScreenRecorderRef } from "./ScreenRecorder";
import { ScreenSourceSelector } from "./ScreenSourceSelector";
import { MicrophoneSelector } from "./MicrophoneSelector";
import { ExportLocationSelector } from "./ExportLocationSelector";
import { RecordButton } from "./RecordButton";
import { previewService } from "../services/previewService";
import { VideoPlayerWithControls, VideoPlayerWithControlsRef } from "./VideoPlayerWithControls";
import { Button } from "./ui/button";
import { Toaster } from "sonner";
import { ipcClient } from "../services/ipcClient";

interface ScreenRecordingEditorProps {
  onBackToWelcome: () => void;
}

export function ScreenRecordingEditor({ onBackToWelcome }: ScreenRecordingEditorProps) {
  const { 
    isRecordingScreen, 
    recordingStartTime,
    setRecordingScreen,
    setRecordingStartTime,
    setWorkflow
  } = useProjectStore();

  const [isLoading, setIsLoading] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);
  const [previewStream, setPreviewStream] = useState<MediaStream | null>(null);
  const [hasRecorded, setHasRecorded] = useState(false);
  const [micEnabled, setMicEnabled] = useState(false);
  const [micDeviceId, setMicDeviceId] = useState<string | null>(null);
  const [exportPath, setExportPath] = useState<string | null>(null);
  
  const screenRecorderRef = useRef<ScreenRecorderRef>(null);
  const videoPlayerRef = useRef<VideoPlayerWithControlsRef>(null);

  // Update recording duration every second
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (recordingStartTime) {
      interval = setInterval(() => {
        setRecordingDuration(Math.floor((Date.now() - recordingStartTime) / 1000));
      }, 1000);
    } else {
      setRecordingDuration(0);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [recordingStartTime]);

  // Handle source change and preview
  const handleSourceChange = async (sourceId: string | null) => {
    console.log("ScreenRecordingEditor: handleSourceChange called with:", sourceId);
    setSelectedSourceId(sourceId);
    
    if (sourceId) {
      // Use ScreenRecorder's preview methods for screen source
      // Pass the sourceId directly to avoid state timing issues
      try {
        await screenRecorderRef.current?.startPreviewWithSource(sourceId);
      } catch (error) {
        console.warn("Failed to start screen preview:", error);
        setPreviewStream(null);
      }
    } else {
      // No source selected, clear preview
      setPreviewStream(null);
      screenRecorderRef.current?.stopPreview();
    }
  };

  // Cleanup preview on unmount
  useEffect(() => {
    return () => {
      previewService.stopCurrentStream();
      screenRecorderRef.current?.stopPreview();
    };
  }, []);

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStartRecording = async () => {
    try {
      if (!selectedSourceId) {
        toast.error("Please select a screen source first");
        return;
      }
      
      if (!exportPath) {
        toast.error("Please choose where to save your recording");
        return;
      }
      
      console.log("Starting screen recording...");
      setRecordingScreen(true);
      setRecordingStartTime(Date.now());
      
      // Pass microphone device ID if enabled
      const micDevice = micEnabled && micDeviceId ? micDeviceId : undefined;
      await screenRecorderRef.current?.startRecording(micDevice);
      
      const message = micEnabled ? "Screen recording with microphone started" : "Screen recording started";
      toast.success(message);
    } catch (error) {
      console.error("Failed to start recording:", error);
      toast.error(error instanceof Error ? error.message : "Failed to start recording");
    }
  };

  const handleStopRecording = () => {
    try {
      if (isRecordingScreen) {
        screenRecorderRef.current?.stopRecording();
      }
    } catch (error) {
      console.error("Failed to stop recording:", error);
      toast.error(error instanceof Error ? error.message : "Failed to stop recording");
    }
  };

  const handleScreenRecordingComplete = async (path: string, metadata: any) => {
    console.log("Screen recording completed:", path, metadata);
    
    try {
      // Copy the final video to the user's chosen location
      await ipcClient.copyFile(path, exportPath!);
      
      console.log("Video saved to:", exportPath);
      toast.success(`Recording saved to: ${exportPath}`);
      
      // Reset the form for next recording
      setRecordingScreen(false);
      setRecordingStartTime(null);
      setHasRecorded(false);
      setExportPath(null);
      setSelectedSourceId(null);
      setMicEnabled(false);
      setMicDeviceId(null);
      
    } catch (error) {
      console.error("Failed to save recording to chosen location:", error);
      toast.error("Failed to save recording to chosen location");
    }
  };

  const handleRecordingError = (error: string) => {
    console.error("Recording error:", error);
    toast.error(error);
    setIsLoading(false);
    
    // Reset recording states on error
    setRecordingScreen(false);
    setRecordingStartTime(null);
  };


  const handleBackToWelcome = () => {
    onBackToWelcome();
  };

  const handleReset = () => {
    setWorkflow('welcome');
  };

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
              <h1 className="text-2xl font-bold text-white">Screen Recording</h1>
            </div>
            <div className="flex gap-2">
              {hasRecorded && (
                <Button
                  onClick={handleReset}
                  variant="secondary"
                  title="Start over"
                >
                  New Recording
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <div className="space-y-6">
          {/* Recording Controls */}
          {!hasRecorded && (
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Recording Setup</h2>
              
              <div className="space-y-4">
                {/* Screen Source Selection */}
                <div className="flex items-center gap-4">
                  <label className="text-sm font-medium text-gray-300">Screen Source:</label>
                  <ScreenSourceSelector
                    selectedSourceId={selectedSourceId}
                    onSourceChange={handleSourceChange}
                    disabled={isRecordingScreen}
                  />
                </div>

                {/* Microphone Selection */}
                <div className="flex items-center gap-4">
                  <label className="text-sm font-medium text-gray-300">Microphone:</label>
                  <MicrophoneSelector
                    enabled={micEnabled}
                    selectedDeviceId={micDeviceId}
                    onEnabledChange={setMicEnabled}
                    onDeviceChange={setMicDeviceId}
                    disabled={isRecordingScreen}
                  />
                </div>

                {/* Export Location Selection */}
                <div className="flex items-center gap-4">
                  <label className="text-sm font-medium text-gray-300">Save to:</label>
                  <ExportLocationSelector
                    onLocationChange={setExportPath}
                    disabled={isRecordingScreen}
                  />
                </div>

                {/* Recording Status */}
                {isRecordingScreen && (
                  <div className="flex items-center gap-2 text-red-400">
                    <Circle className="h-3 w-3 fill-red-400 animate-pulse" />
                    <span className="text-sm font-medium">
                      Recording: {formatDuration(recordingDuration)}
                      {micEnabled && " (with microphone)"}
                    </span>
                  </div>
                )}

                {/* Record Button */}
                <div className="flex justify-center">
                  <RecordButton
                    isRecording={isRecordingScreen}
                    hasSelectedSource={!!selectedSourceId && !!exportPath}
                    onStartRecording={handleStartRecording}
                    onStopRecording={handleStopRecording}
                    disabled={isLoading}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Video Player with Controls - Only show preview when not recorded */}
          {!hasRecorded && (
            <VideoPlayerWithControls 
              ref={videoPlayerRef} 
              previewStream={previewStream}
            />
          )}
        </div>
      </main>

      {/* Hidden recorder component */}
      <ScreenRecorder
        ref={screenRecorderRef}
        onRecordingComplete={handleScreenRecordingComplete}
        onError={handleRecordingError}
        onStreamChange={setPreviewStream}
        onPreviewError={(error) => {
          console.warn("Screen preview error:", error);
          setPreviewStream(null);
        }}
        selectedSourceId={selectedSourceId}
      />

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
