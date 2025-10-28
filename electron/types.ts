export interface FFmpegOptions {
  inputPath: string;
  outputPath: string;
  startTime: number;
  endTime: number;
  scaleToHeight?: number;
}

export interface VideoClipParams {
  inputPath: string;
  outputPath: string;
  startTime: number;
  endTime: number;
  scaleToHeight?: number;
}

export interface FFmpegProgressData {
  progress: number;
  time: number;
  speed: number;
  eta: number;
}

export interface FFmpegResult {
  success: boolean;
  outputPath?: string;
  error?: string;
}

export interface VideoMetadata {
  duration: number;
  width: number;
  height: number;
  format: string;
  bitrate?: number;
  fps?: number;
}
