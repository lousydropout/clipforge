import { useState, useEffect, useRef } from "react";
import { useProjectStore } from "../store/useProjectStore";
import { Circle } from "lucide-react";
import { toast } from "sonner";
import { ScreenRecorder, ScreenRecorderRef } from "./ScreenRecorder";
import { CameraRecorder, CameraRecorderRef } from "./CameraRecorder";
import { SourceSelector, RecordingSource } from "./SourceSelector";
import { RecordButton } from "./RecordButton";
import { previewService } from "../services/previewService";
import { VideoPlayerWithControls, VideoPlayerWithControlsRef } from "./VideoPlayerWithControls";
import { Timeline } from "./timeline/Timeline";
import { SettingsPanel } from "./SettingsPanel";
import { Button } from "./ui/button";
import { Separator } from "./ui/separator";
import { Toaster } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

interface ScreenOverlayEditorProps {
  onBackToWelcome: () => void;
}

export function ScreenOverlayEditor({ onBackToWelcome }: ScreenOverlayEditorProps) {
  const { 
    isRecordingScreen, 
    isRecordingCamera,
    recordingStartTime,
    setRecordingScreen,
    setRecordingCamera,
    setRecordingStartTime,
    updateTrack,
    setMainTrack,
    setOverlayTrack,
    project,
    setWorkflow
  } = useProjectStore();

  const [isLoading, setIsLoading] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [screenSource, setScreenSource] = useState<RecordingSource>("screen");
  const [cameraSource, setCameraSource] = useState<RecordingSource>("camera");
  const [previewStream, setPreviewStream] = useState<MediaStream | null>(null);
  const [hasRecorded, setHasRecorded] = useState(false);
  const [recordingPhase, setRecordingPhase] = useState<'setup' | 'recording' | 'editing'>('setup');
  
  const screenRecorderRef = useRef<ScreenRecorderRef>(null);
  const cameraRecorderRef = useRef<CameraRecorderRef>(null);
  const videoPlayerRef = useRef<VideoPlayerWithControlsRef>(null);

  const videoPath = project?.mainTrack?.path;
  const overlayPath = project?.overlayTrack?.path;

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
  const handleSourceChange = async (source: RecordingSource, type: 'screen' | 'camera') => {
    if (type === 'screen') {
      setScreenSource(source);
    } else {
      setCameraSource(source);
    }
    
    try {
      const stream = await previewService.getPreviewStream(source);
      setPreviewStream(stream);
    } catch (error) {
      console.warn("Failed to get preview stream:", error);
      setPreviewStream(null);
    }
  };

  // Cleanup preview on unmount
  useEffect(() => {
    return () => {
      previewService.stopCurrentStream();
    };
  }, []);

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStartRecording = async () => {
    try {
      console.log("Starting dual recording...");
      setRecordingPhase('recording');
      setRecordingScreen(true);
      setRecordingCamera(true);
      setRecordingStartTime(Date.now());
      
      // Start both recorders
      screenRecorderRef.current?.startRecording();
      cameraRecorderRef.current?.startRecording();
      
      toast.success("Dual recording started - screen and camera");
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
      if (isRecordingCamera) {
        cameraRecorderRef.current?.stopRecording();
      }
    } catch (error) {
      console.error("Failed to stop recording:", error);
      toast.error(error instanceof Error ? error.message : "Failed to stop recording");
    }
  };

  const handleScreenRecordingComplete = (path: string, metadata: any) => {
    console.log("Screen recording completed:", path, metadata);
    
    // Update mainTrack with recorded video
    if (project) {
      console.log("ScreenOverlayEditor: Updating existing project mainTrack");
      updateTrack("main", {
        path,
        metadata,
        startTime: 0,
        endTime: metadata.duration,
      });
    } else {
      console.log("ScreenOverlayEditor: Creating new project with mainTrack");
      setMainTrack({
        id: "main-1",
        source: "screen",
        path,
        metadata,
        startTime: 0,
        endTime: metadata.duration,
      });
    }
    
    setRecordingScreen(false);
    if (!isRecordingCamera) {
      setRecordingStartTime(null);
      setRecordingPhase('editing');
      setHasRecorded(true);
      toast.success("Screen recording saved!");
    }
  };

  const handleCameraRecordingComplete = (path: string, metadata: any) => {
    console.log("Camera recording completed:", path, metadata);
    
    // Camera goes to overlay track for PiP
    if (project) {
      updateTrack("overlay", {
        path,
        metadata,
        startTime: 0,
        endTime: metadata.duration,
      });
    } else {
      setOverlayTrack({
        id: "overlay-1",
        source: "camera",
        path,
        metadata,
        startTime: 0,
        endTime: metadata.duration,
      });
    }
    
    setRecordingCamera(false);
    if (!isRecordingScreen) {
      setRecordingStartTime(null);
      setRecordingPhase('editing');
      setHasRecorded(true);
      toast.success("Camera recording saved! Both tracks ready for editing.");
    }
  };

  const handleRecordingError = (error: string) => {
    console.error("Recording error:", error);
    toast.error(error);
    setIsLoading(false);
    
    // Reset recording states on error
    setRecordingScreen(false);
    setRecordingCamera(false);
    setRecordingStartTime(null);
    setRecordingPhase('setup');
  };

  const handleTimelineSeek = (time: number) => {
    videoPlayerRef.current?.seekTo(time);
  };

  const handleBackToWelcome = () => {
    onBackToWelcome();
  };

  const handleReset = () => {
    setWorkflow('welcome');
  };

  const isAnyRecording = isRecordingScreen || isRecordingCamera;

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
              <h1 className="text-2xl font-bold text-white">Screen + Overlay Recording</h1>
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
          {recordingPhase !== 'editing' && (
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Dual Recording Setup</h2>
              
              <div className="space-y-6">
                {/* Source Selection */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-300">Screen Source:</label>
                    <SourceSelector
                      selectedSource={screenSource}
                      onSourceChange={(source) => handleSourceChange(source, 'screen')}
                      disabled={isAnyRecording}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-300">Camera Source:</label>
                    <SourceSelector
                      selectedSource={cameraSource}
                      onSourceChange={(source) => handleSourceChange(source, 'camera')}
                      disabled={isAnyRecording}
                    />
                  </div>
                </div>

                {/* Recording Status */}
                {isAnyRecording && (
                  <div className="flex items-center gap-2 text-red-400">
                    <Circle className="h-3 w-3 fill-red-400 animate-pulse" />
                    <span className="text-sm font-medium">
                      Recording: {formatDuration(recordingDuration)}
                    </span>
                  </div>
                )}

                {/* Record Button */}
                <div className="flex justify-center">
                  <RecordButton
                    isRecording={isAnyRecording}
                    hasSelectedSource={true} // Always true for dual recording
                    onStartRecording={handleStartRecording}
                    onStopRecording={handleStopRecording}
                    disabled={isLoading}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Video Player with Controls */}
          <VideoPlayerWithControls 
            ref={videoPlayerRef} 
            previewStream={recordingPhase === 'editing' ? null : previewStream}
          />

          {/* Timeline and Settings - Only show when both videos are recorded */}
          {recordingPhase === 'editing' && videoPath && overlayPath && (
            <>
              <Separator className="bg-gray-700" />
              
              {/* PiP Preview Info */}
              <Card className="bg-blue-900/20 border-blue-500/30">
                <CardHeader>
                  <CardTitle className="text-blue-300">Picture-in-Picture Ready</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-blue-200 text-sm">
                    Both screen and camera recordings are ready. The export will create a PiP video with the camera overlay in the bottom-right corner.
                  </p>
                </CardContent>
              </Card>

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

      {/* Hidden recorder components */}
      <ScreenRecorder
        ref={screenRecorderRef}
        onRecordingComplete={handleScreenRecordingComplete}
        onError={handleRecordingError}
      />
      <CameraRecorder
        ref={cameraRecorderRef}
        onRecordingComplete={handleCameraRecordingComplete}
        onError={handleRecordingError}
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
