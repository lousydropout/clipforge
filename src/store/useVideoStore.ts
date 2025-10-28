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

  // Processing state
  isProcessing: boolean;
  progress: number;

  // Actions
  setVideoPath: (path: string | null) => void;
  setVideoMetadata: (metadata: VideoMetadata | null) => void;
  setStartTime: (time: number) => void;
  setEndTime: (time: number) => void;
  setProcessing: (processing: boolean) => void;
  setProgress: (progress: number) => void;
  reset: () => void;
}

export const useVideoStore = create<VideoStore>((set) => ({
  // Initial state
  videoPath: null,
  videoMetadata: null,
  startTime: 0,
  endTime: 0,
  isProcessing: false,
  progress: 0,

  // Actions
  setVideoPath: (path) => set({ videoPath: path }),
  setVideoMetadata: (metadata) => set({ videoMetadata: metadata }),
  setStartTime: (time) => set({ startTime: time }),
  setEndTime: (time) => set({ endTime: time }),
  setProcessing: (processing) => set({ isProcessing: processing }),
  setProgress: (progress) => set({ progress }),
  reset: () =>
    set({
      videoPath: null,
      videoMetadata: null,
      startTime: 0,
      endTime: 0,
      isProcessing: false,
      progress: 0,
    }),
}));
