import { useState, useEffect, useRef } from "react";
import { useProjectStore } from "../store/useProjectStore";
import { Circle } from "lucide-react";
import { toast } from "sonner";
import { ScreenRecorder, ScreenRecorderRef } from "./ScreenRecorder";
import { CameraRecorder, CameraRecorderRef } from "./CameraRecorder";
import { SourceSelector, RecordingSource } from "./SourceSelector";
import { RecordButton } from "./RecordButton";
import { previewService } from "../services/previewService";

interface RecordingControlsProps {
  onPreviewStreamChange?: (stream: MediaStream | null) => void;
}

export function RecordingControls({ onPreviewStreamChange }: RecordingControlsProps) {
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
    project
  } = useProjectStore();

  const [isLoading, setIsLoading] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [selectedSource, setSelectedSource] = useState<RecordingSource>("none");
  
  // Refs to control the recorder components
  const screenRecorderRef = useRef<ScreenRecorderRef>(null);
  const cameraRecorderRef = useRef<CameraRecorderRef>(null);

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
  const handleSourceChange = async (source: RecordingSource) => {
    setSelectedSource(source);
    
    try {
      const stream = await previewService.getPreviewStream(source);
      onPreviewStreamChange?.(stream);
    } catch (error) {
      console.warn("Failed to get preview stream:", error);
      onPreviewStreamChange?.(null);
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
      if (selectedSource === "screen") {
        console.log("Starting screen recording...");
      setRecordingScreen(true);
      setRecordingStartTime(Date.now());
        screenRecorderRef.current?.startRecording();
      toast.success("Screen recording started");
      } else if (selectedSource === "camera") {
        console.log("Starting camera recording...");
      setRecordingCamera(true);
        setRecordingStartTime(Date.now());
        cameraRecorderRef.current?.startRecording();
        toast.success("Camera recording started");
      }
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
        console.log("RecordingControls: Updating existing project mainTrack");
        updateTrack("main", {
        path,
        metadata,
          startTime: 0,
        endTime: metadata.duration,
        });
      } else {
        console.log("RecordingControls: Creating new project with mainTrack");
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
      }
      toast.success("Screen recording saved");
  };

  const handleCameraRecordingComplete = (path: string, metadata: any) => {
    console.log("Camera recording completed:", path, metadata);
    
    // If both screen and camera are recording, camera goes to overlay track
    // If only camera is recording, it goes to main track
    if (isRecordingScreen) {
      // Both recordings - camera goes to overlay
      console.log("RecordingControls: Adding camera recording to overlay track");
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
    } else {
      // Camera-only recording - goes to main track
      console.log("RecordingControls: Adding camera recording to main track");
      if (project) {
        updateTrack("main", {
          path,
          metadata,
          startTime: 0,
          endTime: metadata.duration,
        });
      } else {
        setMainTrack({
          id: "main-1",
          source: "camera",
          path,
          metadata,
          startTime: 0,
          endTime: metadata.duration,
        });
      }
      }
      
      setRecordingCamera(false);
      if (!isRecordingScreen) {
        setRecordingStartTime(null);
      }
      toast.success("Camera recording saved");
  };

  const handleRecordingError = (error: string) => {
    console.error("Recording error:", error);
    toast.error(error);
      setIsLoading(false);
    
    // Reset recording states on error
    setRecordingScreen(false);
    setRecordingCamera(false);
    setRecordingStartTime(null);
  };



  const isAnyRecording = isRecordingScreen || isRecordingCamera;

  return (
    <div className="flex items-center gap-2">
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

      {/* Recording Status */}
      {isAnyRecording && (
        <div className="flex items-center gap-2 text-red-400">
          <Circle className="h-3 w-3 fill-red-400 animate-pulse" />
          <span className="text-sm font-medium">
            {formatDuration(recordingDuration)}
          </span>
        </div>
      )}

      {/* Source Selection */}
      <SourceSelector
        selectedSource={selectedSource}
        onSourceChange={handleSourceChange}
        disabled={isAnyRecording}
      />

      {/* Record Button */}
      <RecordButton
        isRecording={isAnyRecording}
        hasSelectedSource={selectedSource !== "none"}
        onStartRecording={handleStartRecording}
        onStopRecording={handleStopRecording}
        disabled={isLoading}
      />
    </div>
  );
}
