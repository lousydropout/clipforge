import { forwardRef, useImperativeHandle, useState } from "react";
import { ipcClient } from "../services/ipcClient";
import { VideoMetadata } from "../store/useProjectStore";
import { previewService } from "../services/previewService";

interface ScreenRecorderProps {
  onRecordingComplete: (path: string, metadata: VideoMetadata) => void;
  onError: (error: string) => void;
  onStreamChange?: (stream: MediaStream | null) => void;
  onPreviewError?: (error: string) => void;
}

export interface ScreenRecorderRef {
  startRecording: () => void;
  stopRecording: () => void;
  startPreview: () => void;
  stopPreview: () => void;
}

export const ScreenRecorder = forwardRef<
  ScreenRecorderRef,
  ScreenRecorderProps
>(({ onRecordingComplete, onError, onStreamChange, onPreviewError }, ref) => {
  const [previewStream, setPreviewStream] = useState<MediaStream | null>(null);
  const [recorder, setRecorder] = useState<MediaRecorder | null>(null);
  const [isRecording, setIsRecording] = useState(false);

  // Custom recording methods using the same source as preview
  const startRecording = async () => {
    try {
      console.log("ScreenRecorder: Starting custom screen recording...");

      // Try to reuse the existing preview stream first
      let stream = previewService.getCurrentStream();

      if (!stream) {
        // If no preview stream, create a new one
        const sourceId = previewService.getCurrentSourceId();

        if (sourceId) {
          // Capture video and audio separately, then combine
          console.log(
            "ScreenRecorder: Capturing video and audio separately..."
          );

          // Get video from desktopCapturer (specific source)
          const videoStream = await navigator.mediaDevices.getUserMedia({
            audio: false, // No audio from desktopCapturer
            video: {
              mandatory: {
                chromeMediaSource: "desktop",
                chromeMediaSourceId: sourceId,
                maxFrameRate: 30,
              },
            } as any,
          });

          // Get audio from getDisplayMedia (system audio)
          const audioStream = await navigator.mediaDevices.getDisplayMedia({
            video: false, // No video from getDisplayMedia
            audio: true, // System audio
          });

          // Combine video and audio streams
          stream = new MediaStream([
            ...videoStream.getVideoTracks(),
            ...audioStream.getAudioTracks(),
          ]);

          console.log(
            "ScreenRecorder: Combined streams - Video tracks:",
            videoStream.getVideoTracks().length,
            "Audio tracks:",
            audioStream.getAudioTracks().length
          );
        } else {
          // Fallback to getDisplayMedia for both video and audio
          stream = await navigator.mediaDevices.getDisplayMedia({
            video: true,
            audio: true,
          });
        }
      }

      console.log(
        "ScreenRecorder: Got screen stream, creating MediaRecorder..."
      );
      console.log(
        "Stream tracks:",
        stream.getTracks().map((t) => ({
          kind: t.kind,
          enabled: t.enabled,
          readyState: t.readyState,
        }))
      );

      // Create MediaRecorder
      const mimeType = getSupportedMimeType();
      console.log("Using MIME type for recording:", mimeType);

      let mediaRecorder: MediaRecorder;
      try {
        mediaRecorder = new MediaRecorder(stream, {
          mimeType,
          videoBitsPerSecond: 2_000_000,
          audioBitsPerSecond: 128_000,
        });
        console.log("MediaRecorder created successfully");
      } catch (recorderError) {
        console.error("Failed to create MediaRecorder:", recorderError);
        throw new Error(
          `Failed to create MediaRecorder: ${
            recorderError instanceof Error
              ? recorderError.message
              : "Unknown error"
          }`
        );
      }

      // Set up data collection
      const chunks: Blob[] = [];
      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        console.log("ScreenRecorder: Recording stopped, processing data...");
        try {
          const blob = new Blob(chunks, { type: mimeType });
          const arrayBuffer = await blob.arrayBuffer();

          // Save the recording via IPC
          const baseFilename = `screen_recording_${Date.now()}.webm`;
          const tempPath = await ipcClient.saveRecording(
            arrayBuffer,
            baseFilename
          );

          // Skip conversion by default - use WebM for internal storage
          // Conversion to MP4 will happen during export if needed
          const finalPath = tempPath;
          console.log(
            "Using WebM file directly (conversion will happen during export):",
            finalPath
          );

          // Get metadata
          const metadata = await ipcClient.getRecordingMetadata(finalPath);

          // Convert file path to file:// URL for the renderer process
          const videoUrl = `file://${finalPath}`;

          // Notify parent component
          onRecordingComplete(videoUrl, metadata);
        } catch (err) {
          console.error("Failed to save screen recording:", err);
          onError(
            err instanceof Error
              ? err.message
              : "Failed to save screen recording"
          );
        }
      };

      mediaRecorder.onerror = (event) => {
        console.error("MediaRecorder error:", event);
        onError("Recording failed");
      };

      // Start recording
      mediaRecorder.start(2000); // Collect data every 2 seconds
      setRecorder(mediaRecorder);
      setIsRecording(true);

      console.log("ScreenRecorder: Recording started successfully");
    } catch (err) {
      console.error("Failed to start screen recording:", err);
      onError(
        err instanceof Error ? err.message : "Failed to start screen recording"
      );
    }
  };

  const stopRecording = () => {
    if (recorder && isRecording) {
      console.log("ScreenRecorder: Stopping recording...");
      recorder.stop();
      setIsRecording(false);
      setRecorder(null);
    }
  };

  // Helper function to get supported MIME type
  const getSupportedMimeType = (): string => {
    const candidates = [
      "video/webm;codecs=vp9,opus",
      "video/webm;codecs=vp8,opus",
      "video/webm",
    ];
    for (const t of candidates) {
      if (MediaRecorder.isTypeSupported(t)) {
        console.log("Using MIME type:", t);
        return t;
      }
    }
    console.warn("Falling back to default WebM");
    return "video/webm";
  };

  // Preview methods
  const startPreview = async () => {
    try {
      // Check if getDisplayMedia is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
        throw new Error("Screen capture not supported in this environment");
      }

      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      });
      setPreviewStream(stream);
      onStreamChange?.(stream);
    } catch (err) {
      console.warn("Failed to start screen preview:", err);
      const errorMessage =
        err instanceof Error ? err.message : "Failed to start screen preview";

      // Use preview error callback instead of recording error callback
      if (onPreviewError) {
        if (
          errorMessage.includes("Not supported") ||
          errorMessage.includes("not supported")
        ) {
          onPreviewError("Screen preview not available in this environment");
        } else if (errorMessage.includes("Permission denied")) {
          onPreviewError("Screen capture permission denied");
        } else {
          onPreviewError(errorMessage);
        }
      }
    }
  };

  const stopPreview = () => {
    if (previewStream) {
      previewStream.getTracks().forEach((track) => track.stop());
      setPreviewStream(null);
      onStreamChange?.(null);
    }
  };

  // Expose methods to parent via ref
  useImperativeHandle(ref, () => ({
    startRecording: () => {
      console.log(
        "ScreenRecorder: startRecording called, current status:",
        status
      );
      startRecording();
    },
    stopRecording: () => {
      console.log(
        "ScreenRecorder: stopRecording called, current status:",
        status
      );
      stopRecording();
    },
    startPreview,
    stopPreview,
  }));

  return null; // This component doesn't render anything
});
