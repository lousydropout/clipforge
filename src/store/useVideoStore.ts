import { create } from "zustand";

export interface VideoMetadata {
  duration: number;
  width: number;
  height: number;
  format: string;
  bitrate?: number;
  fps?: number;
}

interface VideoStore {
  // Video data
  videoPath: string | null;
  videoMetadata: VideoMetadata | null;

  // Trim settings
  startTime: number;
  endTime: number;
  outputResolutionPercent: number;

  // Processing state
  isProcessing: boolean;
  progress: number;

  // Timeline state
  currentTime: number;
  timelineZoom: number;
  playbackSpeed: number;

  // Actions
  setVideoPath: (path: string | null) => void;
  setVideoMetadata: (metadata: VideoMetadata | null) => void;
  setStartTime: (time: number) => void;
  setEndTime: (time: number) => void;
  setOutputResolutionPercent: (percent: number) => void;
  setProcessing: (processing: boolean) => void;
  setProgress: (progress: number) => void;
  setCurrentTime: (time: number) => void;
  setTimelineZoom: (zoom: number) => void;
  setPlaybackSpeed: (speed: number) => void;
  reset: () => void;
}

export const useVideoStore = create<VideoStore>((set) => ({
  // Initial state
  videoPath: null,
  videoMetadata: null,
  startTime: 0,
  endTime: 0,
  outputResolutionPercent: 100,
  isProcessing: false,
  progress: 0,
  currentTime: 0,
  timelineZoom: 1.0,
  playbackSpeed: 1.0,

  // Actions
  setVideoPath: (path) => set({ videoPath: path }),
  setVideoMetadata: (metadata) => set({ videoMetadata: metadata }),
  setStartTime: (time) => set({ startTime: time }),
  setEndTime: (time) => set({ endTime: time }),
  setOutputResolutionPercent: (percent) =>
    set({ outputResolutionPercent: percent }),
  setProcessing: (processing) => set({ isProcessing: processing }),
  setProgress: (progress) => set({ progress }),
  setCurrentTime: (time) => set({ currentTime: time }),
  setTimelineZoom: (zoom) => set({ timelineZoom: zoom }),
  setPlaybackSpeed: (speed) => set({ playbackSpeed: speed }),
  reset: () =>
    set({
      videoPath: null,
      videoMetadata: null,
      startTime: 0,
      endTime: 0,
      outputResolutionPercent: 100,
      isProcessing: false,
      progress: 0,
      currentTime: 0,
      timelineZoom: 1.0,
      playbackSpeed: 1.0,
    }),
}));
