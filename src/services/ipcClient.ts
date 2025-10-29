import { VideoMetadata } from "../store/useVideoStore";

export interface ImportVideoResponse {
  success: boolean;
  videoPath?: string;
  error?: string;
  metadata?: VideoMetadata;
}

export interface ClipVideoRequest {
  inputPath: string;
  outputPath: string;
  startTime: number;
  endTime: number;
  scaleToHeight?: number;
}

export interface ClipVideoResponse {
  success: boolean;
  outputPath?: string;
  error?: string;
}

export interface ExportVideoRequest {
  inputPath: string;
  startTime: number;
  endTime: number;
  scaleToHeight?: number;
  playbackSpeed?: number;
}

export interface ExportVideoResponse {
  success: boolean;
  outputPath?: string;
  error?: string;
  cancelled?: boolean;
}

export interface FFmpegProgress {
  progress: number;
  time: number;
  speed: number;
  eta: number;
}

// IPC Client wrapper for secure communication with main process
export const ipcClient = {
  // Import video file
  async importVideo(): Promise<ImportVideoResponse> {
    try {
      const result = await window.api.invoke("video.import");
      return result;
    } catch (error) {
      console.error("Failed to import video:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },

  // Clip video with FFmpeg
  async clipVideo(params: ClipVideoRequest): Promise<ClipVideoResponse> {
    try {
      const result = await window.api.invoke("video.clip", params);
      return result;
    } catch (error) {
      console.error("Failed to clip video:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },

  // Export video to selected location
  async exportVideo(params: ExportVideoRequest): Promise<ExportVideoResponse> {
    try {
      const result = await window.api.invoke("video.export", params);
      return result;
    } catch (error) {
      console.error("Failed to export video:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },

  // Listen to FFmpeg progress updates
  onProgress(callback: (progress: FFmpegProgress) => void): void {
    window.api.on("ffmpeg.progress", callback);
  },

  // Remove progress listener
  offProgress(callback: (progress: FFmpegProgress) => void): void {
    window.api.off("ffmpeg.progress", callback);
  },
};
