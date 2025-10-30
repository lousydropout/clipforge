import React, { forwardRef, useImperativeHandle, useState } from "react";
import { ipcClient } from "../services/ipcClient";
import { VideoMetadata } from "../store/useProjectStore";
import { previewService } from "../services/previewService";

interface ScreenRecorderProps {
  onRecordingComplete: (path: string, metadata: VideoMetadata) => void;
  onError: (error: string) => void;
  onStreamChange?: (stream: MediaStream | null) => void;
  onPreviewError?: (error: string) => void;
  selectedSourceId?: string | null;
}

export interface ScreenRecorderRef {
  startRecording: (microphoneDeviceId?: string) => Promise<void>;
  stopRecording: () => void;
  startPreview: () => void;
  startPreviewWithSource: (sourceId: string) => Promise<void>;
  stopPreview: () => void;
}

export const ScreenRecorder = forwardRef<
  ScreenRecorderRef,
  ScreenRecorderProps
>(
  (
    {
      onRecordingComplete,
      onError,
      onStreamChange,
      onPreviewError,
      selectedSourceId,
    },
    ref
  ) => {
    const [previewStream, setPreviewStream] = useState<MediaStream | null>(
      null
    );
    const [screenRecorder, setScreenRecorder] = useState<MediaRecorder | null>(
      null
    );
    const [micRecorder, setMicRecorder] = useState<MediaRecorder | null>(null);
    const [isRecording, setIsRecording] = useState(false);
    const [screenPath, setScreenPath] = useState<string | null>(null);
    const [micPath, setMicPath] = useState<string | null>(null);

    // Dual recorder implementation
    const startRecording = async (microphoneDeviceId?: string) => {
      try {
        console.log("ScreenRecorder: Starting dual recorder approach...");

        if (!selectedSourceId) {
          throw new Error("No screen source selected");
        }

        // 1. Capture screen video + (optional system audio) using selected source
        const screenStream = await navigator.mediaDevices.getUserMedia({
          audio: false, // No audio from desktopCapturer
          video: {
            mandatory: {
              chromeMediaSource: "desktop",
              chromeMediaSourceId: selectedSourceId,
              maxFrameRate: 30,
            },
          } as any,
        });

        // Try to get system audio separately
        let audioStream: MediaStream | null = null;
        try {
          audioStream = await navigator.mediaDevices.getDisplayMedia({
            video: false,
            audio: true,
          });
        } catch (audioError) {
          console.warn("System audio not available:", audioError);
        }

        // Combine video and audio streams
        const combinedStream = new MediaStream([
          ...screenStream.getVideoTracks(),
          ...(audioStream ? audioStream.getAudioTracks() : []),
        ]);

        console.log(
          "Combined stream tracks:",
          combinedStream.getTracks().map((t) => ({
            kind: t.kind,
            enabled: t.enabled,
            readyState: t.readyState,
          }))
        );

        // Check if we got audio tracks
        const audioTracks = combinedStream.getAudioTracks();
        if (audioTracks.length === 0) {
          console.warn(
            "No system audio tracks available - recording video only"
          );
        }

        // 2. Create screen recorder
        const screenMimeType = getSupportedMimeType("video");
        const screenRecorder = new MediaRecorder(combinedStream, {
          mimeType: screenMimeType,
          videoBitsPerSecond: 2_000_000,
          audioBitsPerSecond: 128_000,
        });

        // 3. Capture microphone separately if enabled
        let micStream: MediaStream | null = null;
        let micRecorder: MediaRecorder | null = null;

        if (microphoneDeviceId) {
          try {
            micStream = await navigator.mediaDevices.getUserMedia({
              audio: {
                deviceId: microphoneDeviceId,
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true,
              },
            });

            const micMimeType = getSupportedMimeType("audio");
            micRecorder = new MediaRecorder(micStream, {
              mimeType: micMimeType,
              audioBitsPerSecond: 128_000,
            });

            console.log("Microphone stream captured successfully");
          } catch (micError) {
            console.warn("Failed to capture microphone:", micError);
            // Continue without microphone
          }
        }

        // 4. Set up screen recorder data collection
        const screenChunks: Blob[] = [];
        screenRecorder.ondataavailable = (event) => {
          if (event.data && event.data.size > 0) {
            screenChunks.push(event.data);
          }
        };

        screenRecorder.onstop = async () => {
          console.log("Screen recorder stopped, processing...");
          try {
            const blob = new Blob(screenChunks, { type: screenMimeType });
            const arrayBuffer = await blob.arrayBuffer();
            const filename = `screen_${Date.now()}.webm`;
            const path = await ipcClient.saveRecording(arrayBuffer, filename);
            setScreenPath(path);
            console.log("Screen recording saved:", path);
          } catch (err) {
            console.error("Failed to save screen recording:", err);
            onError("Failed to save screen recording");
          }
        };

        // 5. Set up microphone recorder data collection
        let micChunks: Blob[] = [];
        if (micRecorder) {
          micRecorder.ondataavailable = (event) => {
            if (event.data && event.data.size > 0) {
              micChunks.push(event.data);
            }
          };

          micRecorder.onstop = async () => {
            console.log("Microphone recorder stopped, processing...");
            try {
              const blob = new Blob(micChunks, { type: micRecorder.mimeType });
              const arrayBuffer = await blob.arrayBuffer();
              const filename = `mic_${Date.now()}.webm`;
              const path = await ipcClient.saveRecording(arrayBuffer, filename);
              setMicPath(path);
              console.log("Microphone recording saved:", path);
            } catch (err) {
              console.error("Failed to save microphone recording:", err);
              onError("Failed to save microphone recording");
            }
          };
        }

        // 6. Set up error handlers
        screenRecorder.onerror = (event) => {
          console.error("Screen recorder error:", event);
          onError("Screen recording failed");
        };

        if (micRecorder) {
          micRecorder.onerror = (event) => {
            console.error("Microphone recorder error:", event);
            onError("Microphone recording failed");
          };
        }

        // 7. Start both recorders
        screenRecorder.start(2000); // Collect data every 2 seconds
        if (micRecorder) {
          micRecorder.start(2000);
        }

        setScreenRecorder(screenRecorder);
        setMicRecorder(micRecorder);
        setIsRecording(true);

        console.log("Dual recording started successfully");
      } catch (err) {
        console.error("Failed to start recording:", err);
        onError(
          err instanceof Error ? err.message : "Failed to start recording"
        );
      }
    };

    const stopRecording = () => {
      if (isRecording) {
        console.log("ScreenRecorder: Stopping dual recording...");

        if (screenRecorder) {
          screenRecorder.stop();
          setScreenRecorder(null);
        }

        if (micRecorder) {
          micRecorder.stop();
          setMicRecorder(null);
        }

        setIsRecording(false);
      }
    };

    // Check if both recordings are complete and merge them
    const checkAndMergeRecordings = async () => {
      // We need screen recording to be complete
      // If microphone was requested, we also need mic recording to be complete
      // If no microphone was requested, we can proceed with just screen recording
      const shouldHaveMic = micRecorder !== null; // If we created a mic recorder, we need micPath
      const canProceed = screenPath && (!shouldHaveMic || micPath);

      if (canProceed) {
        try {
          console.log("Both recordings complete, merging...");

          let finalPath = screenPath;

          // If we have microphone audio, merge it with screen audio
          if (micPath) {
            try {
              const mergedPath = await ipcClient.mergeAudioVideo({
                videoPath: screenPath,
                audioPath: micPath,
                outputFilename: `screen_with_mic_${Date.now()}.webm`,
              });
              finalPath = mergedPath;
              console.log("Audio merged successfully:", finalPath);
            } catch (mergeError) {
              console.warn(
                "Failed to merge audio, using screen-only recording:",
                mergeError
              );
              // Continue with screen-only recording
            }
          }

          // Get metadata for the final file
          const metadata = await ipcClient.getRecordingMetadata(finalPath);
          const videoUrl = `file://${finalPath}`;

          // Reset state
          setScreenPath(null);
          setMicPath(null);

          // Notify parent component
          onRecordingComplete(videoUrl, metadata);
        } catch (err) {
          console.error("Failed to process recordings:", err);
          onError("Failed to process recordings");
        }
      }
    };

    // Watch for both recordings to complete
    React.useEffect(() => {
      const shouldHaveMic = micRecorder !== null;
      const canProceed = screenPath && (!shouldHaveMic || micPath);

      if (canProceed) {
        checkAndMergeRecordings();
      }
    }, [screenPath, micPath, micRecorder]);

    // Helper function to get supported MIME type
    const getSupportedMimeType = (type: "video" | "audio"): string => {
      if (type === "video") {
        const candidates = [
          "video/webm;codecs=vp9,opus",
          "video/webm;codecs=vp8,opus",
          "video/webm",
        ];
        for (const t of candidates) {
          if (MediaRecorder.isTypeSupported(t)) {
            console.log("Using video MIME type:", t);
            return t;
          }
        }
        console.warn("Falling back to default video WebM");
        return "video/webm";
      } else {
        const candidates = ["audio/webm;codecs=opus", "audio/webm"];
        for (const t of candidates) {
          if (MediaRecorder.isTypeSupported(t)) {
            console.log("Using audio MIME type:", t);
            return t;
          }
        }
        console.warn("Falling back to default audio WebM");
        return "audio/webm";
      }
    };

    // Preview methods
    const startPreview = async () => {
      try {
        if (!selectedSourceId) {
          throw new Error("No screen source selected");
        }

        console.log(
          "ScreenRecorder: Starting preview with source ID:",
          selectedSourceId
        );

        // Use the selected source ID directly to get the stream
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false, // No audio for preview
          video: {
            mandatory: {
              chromeMediaSource: "desktop",
              chromeMediaSourceId: selectedSourceId,
              maxFrameRate: 30,
            },
          } as any,
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

    const startPreviewWithSource = async (sourceId: string) => {
      try {
        console.log(
          "ScreenRecorder: Starting preview with explicit source ID:",
          sourceId
        );

        // Use the provided source ID directly to get the stream
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false, // No audio for preview
          video: {
            mandatory: {
              chromeMediaSource: "desktop",
              chromeMediaSourceId: sourceId,
              maxFrameRate: 30,
            },
          } as any,
        });

        setPreviewStream(stream);
        onStreamChange?.(stream);
      } catch (err) {
        console.warn("Failed to start screen preview with source:", err);
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
      // Also stop the preview service
      previewService.stopCurrentStream();
    };

    // Expose methods to parent via ref
    useImperativeHandle(ref, () => ({
      startRecording: (microphoneDeviceId?: string) => {
        console.log(
          "ScreenRecorder: startRecording called with mic device:",
          microphoneDeviceId
        );
        return startRecording(microphoneDeviceId);
      },
      stopRecording: () => {
        console.log("ScreenRecorder: stopRecording called");
        stopRecording();
      },
      startPreview,
      startPreviewWithSource,
      stopPreview,
    }));

    return null; // This component doesn't render anything
  }
);
