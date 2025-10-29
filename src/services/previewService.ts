import { RecordingSource } from "../components/SourceSelector";
import { ipcClient } from "./ipcClient";

export class PreviewService {
  private currentStream: MediaStream | null = null;
  private currentSourceId: string | null = null;

  async getPreviewStream(source: RecordingSource): Promise<MediaStream | null> {
    // Stop current stream if any
    this.stopCurrentStream();

    if (source === "none") {
      return null;
    }

    try {
      let stream: MediaStream;

      if (source === "screen") {
        // Use Electron desktopCapturer for screen preview
        try {
          const sourceId = await ipcClient.showSourceDialog();
          if (!sourceId) {
            throw new Error("No screen source selected");
          }
          
          this.currentSourceId = sourceId;
          
          // For preview, we'll use video only to avoid audio permission prompts
          // Audio will be captured during recording
          stream = await navigator.mediaDevices.getUserMedia({
            audio: false, // No audio for preview
            video: {
              mandatory: {
                chromeMediaSource: "desktop",
                chromeMediaSourceId: sourceId,
                maxFrameRate: 30,
              },
            } as any,
          });
        } catch (electronError) {
          console.warn("Electron screen capture failed, trying getDisplayMedia:", electronError);
          // Fallback to getDisplayMedia
          if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
            throw new Error("Screen capture not supported in this environment");
          }
          stream = await navigator.mediaDevices.getDisplayMedia({
            video: true,
            audio: false, // No audio for preview
          });
        }
      } else if (source === "camera") {
        stream = await navigator.mediaDevices.getUserMedia({
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
      } else {
        return null;
      }

      this.currentStream = stream;
      return stream;
    } catch (error) {
      console.warn(`Failed to get ${source} preview:`, error);
      return null;
    }
  }

  stopCurrentStream() {
    if (this.currentStream) {
      this.currentStream.getTracks().forEach(track => track.stop());
      this.currentStream = null;
    }
    this.currentSourceId = null;
  }

  getCurrentStream(): MediaStream | null {
    return this.currentStream;
  }

  getCurrentSourceId(): string | null {
    return this.currentSourceId;
  }
}

export const previewService = new PreviewService();
