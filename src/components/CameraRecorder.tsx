import { useEffect, forwardRef, useImperativeHandle, useState, useRef } from "react";
import { useReactMediaRecorder } from "react-media-recorder";
import { ipcClient } from "../services/ipcClient";
import { VideoMetadata } from "../store/useProjectStore";

interface CameraRecorderProps {
  onRecordingComplete: (path: string, metadata: VideoMetadata) => void;
  onError: (error: string) => void;
  onStreamChange?: (stream: MediaStream | null) => void;
  onPreviewError?: (error: string) => void;
}

export interface CameraRecorderRef {
  startRecording: () => void;
  stopRecording: () => void;
  startPreview: () => void;
  stopPreview: () => void;
}

export const CameraRecorder = forwardRef<CameraRecorderRef, CameraRecorderProps>(
  ({ onRecordingComplete, onError, onStreamChange, onPreviewError }, ref) => {
  const [previewStream, setPreviewStream] = useState<MediaStream | null>(null);
  const processedBlobUrl = useRef<string | null>(null);
  
  const {
    startRecording,
    stopRecording,
    mediaBlobUrl,
    error,
  } = useReactMediaRecorder({
    video: {
      width: { ideal: 1280 },
      height: { ideal: 720 },
      frameRate: { ideal: 30 },
    },
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
  });

  // Handle mediaBlobUrl changes - this is the finalized blob
  useEffect(() => {
    if (!mediaBlobUrl || processedBlobUrl.current === mediaBlobUrl) return;
    
    // Mark this blob as being processed
    processedBlobUrl.current = mediaBlobUrl;
    
    (async () => {
      try {
        console.log("CameraRecorder: Processing finalized blob...");
        
        // Fetch the finalized blob
        const response = await fetch(mediaBlobUrl);
        const blob = await response.blob();
        const arrayBuffer = await blob.arrayBuffer();
        
        // Save the recording via IPC
        const baseFilename = `camera_recording_${Date.now()}.webm`;
        const tempPath = await ipcClient.saveRecording(arrayBuffer, baseFilename);
        
        // Skip conversion by default - use WebM for internal storage
        // Conversion to MP4 will happen during export if needed
        const finalPath = tempPath;
        console.log("Using WebM file directly (conversion will happen during export):", finalPath);
        
        // Get metadata
        const metadata = await ipcClient.getRecordingMetadata(finalPath);
        
        // Convert file path to file:// URL for the renderer process
        const videoUrl = `file://${finalPath}`;
        
        // Notify parent component
        onRecordingComplete(videoUrl, metadata);
      } catch (err) {
        console.error("Failed to save camera recording:", err);
        onError(err instanceof Error ? err.message : "Failed to save camera recording");
      }
    })();
  }, [mediaBlobUrl]); // Removed function dependencies to prevent infinite loop

  // Preview methods
  const startPreview = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 },
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      setPreviewStream(stream);
      onStreamChange?.(stream);
    } catch (err) {
      console.warn("Failed to start camera preview:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to start camera preview";
      
      // Use preview error callback instead of recording error callback
      if (onPreviewError) {
        onPreviewError(errorMessage);
      }
    }
  };

  const stopPreview = () => {
    if (previewStream) {
      previewStream.getTracks().forEach(track => track.stop());
      setPreviewStream(null);
      onStreamChange?.(null);
    }
  };

  // Expose methods to parent via ref
  useImperativeHandle(ref, () => ({
    startRecording: () => {
      // Reset processed blob URL when starting new recording
      processedBlobUrl.current = null;
      startRecording();
    },
    stopRecording,
    startPreview,
    stopPreview,
  }));

  // Handle errors
  useEffect(() => {
    if (error) {
      console.error("Camera recording error:", error);
      onError(error);
    }
  }, [error, onError]);

  return null; // This component doesn't render anything
});

// Export the hook for direct use
export { useReactMediaRecorder as useCameraRecorder };
