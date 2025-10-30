export interface FFmpegOptions {
  inputPath: string;
  outputPath: string;
  startTime: number;
  endTime: number;
  scaleToHeight?: number;
  scaleFactor?: number; // 0.25 to 1.0 for proportional scaling
  playbackSpeed?: number;
}

export interface VideoClipParams {
  inputPath: string;
  outputPath: string;
  startTime: number;
  endTime: number;
  scaleToHeight?: number;
  scaleFactor?: number; // 0.25 to 1.0 for proportional scaling
  playbackSpeed?: number;
}

export interface FFmpegProgressData {
  progress: number;
}

export interface FFmpegResult {
  success: boolean;
  outputPath?: string;
  error?: string;
  cancelled?: boolean;
}

export interface VideoMetadata {
  duration: number;
  width: number;
  height: number;
  format: string;
  bitrate?: number;
  fps?: number;
}

export interface ExportVideoRequest {
  inputPath: string;
  startTime: number;
  endTime: number;
  scaleToHeight?: number;
  scaleFactor?: number; // 0.25 to 1.0 for proportional scaling
  playbackSpeed?: number;
}

// Recording-related interfaces
export interface RecordingSource {
  id: string;
  name: string;
  thumbnail: string;
}

export interface SaveRecordingRequest {
  buffer: ArrayBuffer;
  filename: string;
}

export interface SaveRecordingResponse {
  success: boolean;
  filePath?: string;
  error?: string;
}
