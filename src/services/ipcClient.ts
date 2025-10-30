import { VideoMetadata } from "../store/useProjectStore";
import { SaveRecordingRequest, SaveRecordingResponse } from "../../electron/types";

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
  scaleFactor?: number; // 0.25 to 1.0 for proportional scaling
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

  // Recording methods

  async saveRecording(buffer: ArrayBuffer, filename: string): Promise<string> {
    try {
      const params: SaveRecordingRequest = { buffer, filename };
      const result: SaveRecordingResponse = await window.api.invoke("recording.saveFile", params);
      
      if (!result.success || !result.filePath) {
        throw new Error(result.error || "Failed to save recording");
      }
      
      return result.filePath;
    } catch (error) {
      console.error("Failed to save recording:", error);
      throw new Error("Failed to save recording");
    }
  },

  async getRecordingMetadata(path: string): Promise<VideoMetadata> {
    try {
      const result = await window.api.invoke("recording.getMetadata", path);
      return result;
    } catch (error) {
      console.error("Failed to get recording metadata:", error);
      throw new Error("Failed to get recording metadata");
    }
  },

  async convertWebmToMp4(webmPath: string, mp4Filename: string): Promise<string> {
    try {
      const result = await window.api.invoke("recording.convertWebmToMp4", { webmPath, mp4Filename });
      return result;
    } catch (error) {
      console.error("Failed to convert WebM to MP4:", error);
      throw new Error("Failed to convert WebM to MP4");
    }
  },

  async getSources(): Promise<{ id: string; name: string; thumbnail: string }[]> {
    try {
      const result = await window.api.invoke("recording.getSources");
      return result;
    } catch (error) {
      console.error("Failed to get sources:", error);
      throw new Error("Failed to get sources");
    }
  },

  async showSourceDialog(): Promise<string | null> {
    try {
      const result = await window.api.invoke("recording.showSourceDialog");
      return result;
    } catch (error) {
      console.error("Failed to show source dialog:", error);
      throw new Error("Failed to show source dialog");
    }
  },

  async mergeAudioVideo(params: {
    videoPath: string;
    audioPath: string;
    outputFilename: string;
  }): Promise<string> {
    try {
      const result = await window.api.invoke("recording.mergeAudioVideo", params);
      return result;
    } catch (error) {
      console.error("Failed to merge audio and video:", error);
      throw new Error("Failed to merge audio and video");
    }
  },

  async showSaveDialog(options: any): Promise<{ canceled: boolean; filePath?: string }> {
    try {
      const result = await window.api.invoke("dialog.showSaveDialog", options);
      return result;
    } catch (error) {
      console.error("Failed to show save dialog:", error);
      throw new Error("Failed to show save dialog");
    }
  },

  async copyFile(sourcePath: string, destinationPath: string): Promise<void> {
    try {
      await window.api.invoke("file.copyFile", { sourcePath, destinationPath });
    } catch (error) {
      console.error("Failed to copy file:", error);
      throw new Error("Failed to copy file");
    }
  },

  async mergePiP(params: {
    screenPath: string;
    cameraPath: string;
    outputPath: string;
  }): Promise<string> {
    try {
      const result = await window.api.invoke("recording.mergePiP", params);
      return result;
    } catch (error) {
      console.error("Failed to merge PiP video:", error);
      throw new Error("Failed to merge PiP video");
    }
  },

  // AI Processing methods
  async extractAudio(params: { videoPath: string }): Promise<string> {
    try {
      const result = await window.api.invoke("ai.extractAudio", params);
      return result;
    } catch (error) {
      console.error("Failed to extract audio:", error);
      throw new Error("Failed to extract audio");
    }
  },
  
  async whisperTranscription(params: { audioPath: string }): Promise<{ text: string; words: Array<{ start: number; end: number; word: string }> }> {
    try {
      const result = await window.api.invoke("ai.whisperTranscription", params);
      return result;
    } catch (error) {
      console.error("Failed to transcribe audio:", error);
      throw new Error("Failed to transcribe audio");
    }
  },
  
  async segmentTranscript(params: {
    words: Array<{ start: number; end: number; word: string }>;
    fullText: string;
  }): Promise<Array<{ text: string; start: number; end: number }>> {
    try {
      const result = await window.api.invoke("ai.segmentTranscript", params);
      return result;
    } catch (error) {
      console.error("Failed to segment transcript:", error);
      throw new Error("Failed to segment transcript");
    }
  },

  async gptShortSuggestions(params: {
    sentences: Array<{ text: string; start: number; end: number }>;
  }): Promise<Array<{ sentence: string; start: number; end: number; score: number; reason: string }>> {
    try {
      const result = await window.api.invoke("ai.gptShortSuggestions", params);
      return result;
    } catch (error) {
      console.error("Failed to get short suggestions:", error);
      throw new Error("Failed to get short suggestions");
    }
  },
  
  async cleanupTempFiles(params: { filePaths: string[] }): Promise<void> {
    try {
      await window.api.invoke("ai.cleanupTempFiles", params);
    } catch (error) {
      console.error("Failed to cleanup temp files:", error);
    }
  },
};
