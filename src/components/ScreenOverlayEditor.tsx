import { useState, useEffect, useRef } from "react";
import { useProjectStore } from "../store/useProjectStore";
import { Circle } from "lucide-react";
import { toast } from "sonner";
import { ScreenRecorder, ScreenRecorderRef } from "./ScreenRecorder";
import { CameraRecorder, CameraRecorderRef } from "./CameraRecorder";
import { ScreenSourceSelector } from "./ScreenSourceSelector";
import { CameraSelector } from "./CameraSelector";
import { ExportLocationSelector } from "./ExportLocationSelector";
import { RecordButton } from "./RecordButton";
import { previewService } from "../services/previewService";
import { VideoPlayerWithControls, VideoPlayerWithControlsRef } from "./VideoPlayerWithControls";
import { Timeline } from "./timeline/Timeline";
import { SettingsPanel } from "./SettingsPanel";
import { Button } from "./ui/button";
import { Separator } from "./ui/separator";
import { Toaster } from "sonner";
import { ipcClient } from "../services/ipcClient";

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
  const [selectedScreenSourceId, setSelectedScreenSourceId] = useState<string | null>(null);
  const [selectedCameraDeviceId, setSelectedCameraDeviceId] = useState<string | null>(null);
  const [screenPreviewStream, setScreenPreviewStream] = useState<MediaStream | null>(null);
  const [cameraPreviewStream, setCameraPreviewStream] = useState<MediaStream | null>(null);
  const [hasRecorded, setHasRecorded] = useState(false);
  const [recordingPhase, setRecordingPhase] = useState<'setup' | 'recording' | 'merging' | 'editing'>('setup');
  const [isMergingPiP, setIsMergingPiP] = useState(false);
  const [screenRecordingPath, setScreenRecordingPath] = useState<string | null>(null);
  const [cameraRecordingPath, setCameraRecordingPath] = useState<string | null>(null);
  const [screenRecordingMetadata, setScreenRecordingMetadata] = useState<any>(null);
  const [cameraRecordingMetadata, setCameraRecordingMetadata] = useState<any>(null);
  const [exportPath, setExportPath] = useState<string | null>(null);
  
  const screenRecorderRef = useRef<ScreenRecorderRef>(null);
  const cameraRecorderRef = useRef<CameraRecorderRef>(null);
  const videoPlayerRef = useRef<VideoPlayerWithControlsRef>(null);

  const videoPath = project?.mainTrack?.path;

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

  // Handle screen source change and preview
  const handleScreenSourceChange = async (sourceId: string | null) => {
    console.log("ScreenOverlayEditor: handleScreenSourceChange called with:", sourceId);
    setSelectedScreenSourceId(sourceId);
    
    if (sourceId) {
      try {
        await screenRecorderRef.current?.startPreviewWithSource(sourceId);
      } catch (error) {
        console.warn("Failed to start screen preview:", error);
        setScreenPreviewStream(null);
      }
    } else {
      setScreenPreviewStream(null);
      screenRecorderRef.current?.stopPreview();
    }
  };

  // Handle camera source change and preview
  const handleCameraSourceChange = async (deviceId: string | null) => {
    console.log("ScreenOverlayEditor: handleCameraSourceChange called with:", deviceId);
    setSelectedCameraDeviceId(deviceId);
    
    if (deviceId) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            deviceId: { exact: deviceId },
            width: { ideal: 1280 },
            height: { ideal: 720 },
            frameRate: { ideal: 30 },
          },
          audio: false, // No audio for camera preview
        });
        setCameraPreviewStream(stream);
      } catch (error) {
        console.warn("Failed to start camera preview:", error);
        setCameraPreviewStream(null);
      }
    } else {
      if (cameraPreviewStream) {
        cameraPreviewStream.getTracks().forEach(track => track.stop());
      }
      setCameraPreviewStream(null);
    }
  };

  // Watch for both recordings being complete and trigger PiP merge
  useEffect(() => {
    if (screenRecordingPath && cameraRecordingPath && 
        screenRecordingMetadata && cameraRecordingMetadata && 
        !isMergingPiP && recordingPhase === 'recording') {
      console.log("🎬 Both recordings detected, triggering PiP merge...");
      handleBothRecordingsComplete();
    }
  }, [screenRecordingPath, cameraRecordingPath, screenRecordingMetadata, cameraRecordingMetadata, isMergingPiP, recordingPhase]);

  // Cleanup preview on unmount
  useEffect(() => {
    return () => {
      previewService.stopCurrentStream();
      screenRecorderRef.current?.stopPreview();
      if (cameraPreviewStream) {
        cameraPreviewStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [cameraPreviewStream]);

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStartRecording = async () => {
    try {
      if (!selectedScreenSourceId) {
        toast.error("Please select a screen source first");
        return;
      }
      
      if (!selectedCameraDeviceId) {
        toast.error("Please select a camera first");
        return;
      }
      
      if (!exportPath) {
        toast.error("Please choose where to save your recording");
        return;
      }
      
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
    console.log("📹 Screen recording completed:", path, metadata);
    
    // Store screen recording data for PiP merge
    setScreenRecordingPath(path);
    setScreenRecordingMetadata(metadata);
    setRecordingScreen(false);
    
    // If camera recording is not active, proceed with screen-only
    if (!isRecordingCamera) {
      console.log("⚠️ Camera recording not active, proceeding with screen-only");
      setRecordingStartTime(null);
      setRecordingPhase('editing');
      setHasRecorded(true);
      toast.success("Screen recording saved!");
    } else {
      console.log("⏳ Waiting for camera recording to complete...");
    }
  };

  const handleCameraRecordingComplete = (path: string, metadata: any) => {
    console.log("📷 Camera recording completed:", path, metadata);
    
    // Store camera recording data for PiP merge
    setCameraRecordingPath(path);
    setCameraRecordingMetadata(metadata);
    setRecordingCamera(false);
    
    // If screen recording is not active, proceed with camera-only
    if (!isRecordingScreen) {
      console.log("⚠️ Screen recording not active, proceeding with camera-only");
      setRecordingStartTime(null);
      setRecordingPhase('editing');
      setHasRecorded(true);
      toast.success("Camera recording saved!");
    } else {
      console.log("⏳ Waiting for screen recording to complete...");
    }
  };

  const handleBothRecordingsComplete = async () => {
    console.log("🎬 ScreenOverlayEditor: handleBothRecordingsComplete called");
    console.log("📊 Recording data check:", {
      screenRecordingPath: !!screenRecordingPath,
      cameraRecordingPath: !!cameraRecordingPath,
      screenRecordingMetadata: !!screenRecordingMetadata,
      cameraRecordingMetadata: !!cameraRecordingMetadata,
      exportPath: !!exportPath
    });
    
    if (!screenRecordingPath || !cameraRecordingPath || !screenRecordingMetadata || !cameraRecordingMetadata) {
      console.error("❌ Missing recording data for PiP merge:", {
        screenRecordingPath,
        cameraRecordingPath,
        screenRecordingMetadata,
        cameraRecordingMetadata
      });
      toast.error("Missing recording data for PiP merge");
      return;
    }

    try {
      console.log("🔄 Starting PiP merge process...");
      setIsMergingPiP(true);
      setRecordingPhase('merging');
      setRecordingStartTime(null);
      
      toast.info("Processing PiP video...");
      
      // Remove file:// prefix from paths for FFmpeg
      const cleanScreenPath = screenRecordingPath.startsWith('file://') 
        ? screenRecordingPath.slice(7) 
        : screenRecordingPath;
      const cleanCameraPath = cameraRecordingPath.startsWith('file://') 
        ? cameraRecordingPath.slice(7) 
        : cameraRecordingPath;
      
      console.log("📁 File paths for FFmpeg:", {
        cleanScreenPath,
        cleanCameraPath,
        originalScreenPath: screenRecordingPath,
        originalCameraPath: cameraRecordingPath
      });
      
      // Merge videos into PiP directly at user's chosen location
      console.log("🎥 Calling ipcClient.mergePiP with:", {
        screenPath: cleanScreenPath,
        cameraPath: cleanCameraPath,
        outputPath: exportPath
      });
      
      const mergedPath = await ipcClient.mergePiP({
        screenPath: cleanScreenPath,
        cameraPath: cleanCameraPath,
        outputPath: exportPath!
      });
      
      console.log("✅ PiP merge completed, final video at:", mergedPath);
      
      // Get metadata for the final video
      console.log("📊 Getting metadata for final video...");
      const mergedMetadata = await ipcClient.getRecordingMetadata(exportPath!);
      const mergedVideoUrl = `file://${exportPath}`;
      console.log("📊 Final video metadata:", mergedMetadata);
      console.log("🔗 Final video URL:", mergedVideoUrl);
      
      // Load merged video into mainTrack only (clear overlayTrack)
      console.log("🎯 Loading merged video into editor...");
      if (project) {
        updateTrack("main", {
          path: mergedVideoUrl,
          metadata: mergedMetadata,
          startTime: 0,
          endTime: mergedMetadata.duration,
        });
        // Clear overlay track since we have a merged video
        setOverlayTrack(null);
        console.log("✅ Updated existing project with merged video");
      } else {
        setMainTrack({
          id: "main-1",
          source: "screen",
          path: mergedVideoUrl,
          metadata: mergedMetadata,
          startTime: 0,
          endTime: mergedMetadata.duration,
        });
        // Clear overlay track
        setOverlayTrack(null);
        console.log("✅ Created new project with merged video");
      }
      
      // Reset state
      console.log("🧹 Resetting state after successful merge...");
      setScreenRecordingPath(null);
      setCameraRecordingPath(null);
      setScreenRecordingMetadata(null);
      setCameraRecordingMetadata(null);
      
      setRecordingPhase('editing');
      setHasRecorded(true);
      setIsMergingPiP(false);
      
      console.log("🎉 PiP merge process completed successfully!");
      toast.success("PiP video ready!");
      
    } catch (error) {
      console.error("❌ Failed to merge PiP video:", error);
      console.error("❌ Error details:", {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      toast.error("Failed to create PiP video, using screen recording only");
      
      // Fallback to screen-only video - copy to user's chosen location
      try {
        console.log("📋 Copying screen-only video to user location:", exportPath);
        await ipcClient.copyFile(screenRecordingPath, exportPath!);
        const fallbackMetadata = await ipcClient.getRecordingMetadata(exportPath!);
        const fallbackVideoUrl = `file://${exportPath}`;
        
        if (project) {
          updateTrack("main", {
            path: fallbackVideoUrl,
            metadata: fallbackMetadata,
            startTime: 0,
            endTime: fallbackMetadata.duration,
          });
          setOverlayTrack(null);
        } else {
          setMainTrack({
            id: "main-1",
            source: "screen",
            path: fallbackVideoUrl,
            metadata: fallbackMetadata,
            startTime: 0,
            endTime: fallbackMetadata.duration,
          });
          setOverlayTrack(null);
        }
        console.log("✅ Fallback video saved successfully");
      } catch (fallbackError) {
        console.error("❌ Failed to copy fallback video:", fallbackError);
        toast.error("Failed to save recording");
      }
      
      // Reset state
      setScreenRecordingPath(null);
      setCameraRecordingPath(null);
      setScreenRecordingMetadata(null);
      setCameraRecordingMetadata(null);
      
      setRecordingPhase('editing');
      setHasRecorded(true);
      setIsMergingPiP(false);
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
    setIsMergingPiP(false);
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
          {recordingPhase !== 'editing' && recordingPhase !== 'merging' && (
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Dual Recording Setup</h2>
              
              <div className="space-y-6">
                {/* Source Selection */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-300">Screen Source:</label>
                    <ScreenSourceSelector
                      selectedSourceId={selectedScreenSourceId}
                      onSourceChange={handleScreenSourceChange}
                      disabled={isAnyRecording}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-300">Camera Source:</label>
                    <CameraSelector
                      selectedDeviceId={selectedCameraDeviceId}
                      onDeviceChange={handleCameraSourceChange}
                      disabled={isAnyRecording}
                    />
                  </div>
                </div>

                {/* Export Location Selection */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">Save to:</label>
                  <ExportLocationSelector
                    onLocationChange={setExportPath}
                    disabled={isAnyRecording}
                  />
                </div>

                {/* Recording Status */}
                {isAnyRecording && (
                  <div className="flex items-center gap-2 text-red-400">
                    <Circle className="h-3 w-3 fill-red-400 animate-pulse" />
                    <span className="text-sm font-medium">
                      Recording screen and camera: {formatDuration(recordingDuration)}
                    </span>
                  </div>
                )}
                
                {/* PiP Merging Status */}
                {isMergingPiP && (
                  <div className="flex items-center gap-2 text-blue-400">
                    <Circle className="h-3 w-3 fill-blue-400 animate-pulse" />
                    <span className="text-sm font-medium">
                      Processing PiP video...
                    </span>
                  </div>
                )}

                {/* Record Button */}
                <div className="flex justify-center">
                  <RecordButton
                    isRecording={isAnyRecording}
                    hasSelectedSource={!!selectedScreenSourceId && !!selectedCameraDeviceId && !!exportPath}
                    onStartRecording={handleStartRecording}
                    onStopRecording={handleStopRecording}
                    disabled={isLoading}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Merging Status */}
          {recordingPhase === 'merging' && (
            <div className="bg-blue-800 border border-blue-600 rounded-lg p-6">
              <div className="flex items-center justify-center gap-3">
                <Circle className="h-4 w-4 fill-blue-400 animate-pulse" />
                <h2 className="text-xl font-semibold text-blue-300">Processing PiP Video</h2>
              </div>
              <p className="text-blue-200 text-center mt-2">
                Merging screen and camera recordings into Picture-in-Picture video...
              </p>
            </div>
          )}

          {/* Completion Status */}
          {recordingPhase === 'editing' && hasRecorded && (
            <div className="bg-green-800 border border-green-600 rounded-lg p-6">
              <div className="flex items-center justify-center gap-3">
                <Circle className="h-4 w-4 fill-green-400" />
                <h2 className="text-xl font-semibold text-green-300">Recording Complete</h2>
              </div>
              <p className="text-green-200 text-center mt-2">
                Your Picture-in-Picture video has been saved and is ready for editing.
              </p>
            </div>
          )}

          {/* Preview Video Players */}
          {recordingPhase !== 'editing' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Screen Preview */}
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-gray-300">Screen Preview</h3>
                <VideoPlayerWithControls 
                  ref={videoPlayerRef} 
                  previewStream={screenPreviewStream}
                />
              </div>
              
              {/* Camera Preview */}
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-gray-300">Camera Preview</h3>
                <VideoPlayerWithControls 
                  previewStream={cameraPreviewStream}
                />
              </div>
            </div>
          )}

          {/* Single Video Player for Editing */}
          {recordingPhase === 'editing' && videoPath && (
            <VideoPlayerWithControls 
              ref={videoPlayerRef} 
              previewStream={null}
            />
          )}

          {/* Timeline and Settings - Only show when video is ready for editing */}
          {recordingPhase === 'editing' && videoPath && (
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

      {/* Hidden recorder components */}
      <ScreenRecorder
        ref={screenRecorderRef}
        onRecordingComplete={handleScreenRecordingComplete}
        onError={handleRecordingError}
        onStreamChange={setScreenPreviewStream}
        onPreviewError={(error) => {
          console.warn("Screen preview error:", error);
          setScreenPreviewStream(null);
        }}
        selectedSourceId={selectedScreenSourceId}
      />
      <CameraRecorder
        ref={cameraRecorderRef}
        onRecordingComplete={handleCameraRecordingComplete}
        onError={handleRecordingError}
        onStreamChange={setCameraPreviewStream}
        onPreviewError={(error) => {
          console.warn("Camera preview error:", error);
          setCameraPreviewStream(null);
        }}
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
