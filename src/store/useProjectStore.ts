import { create } from "zustand";

export interface VideoMetadata {
  duration: number;
  width: number;
  height: number;
  format: string;
  bitrate?: number;
  fps?: number;
}

export interface VideoTrack {
  id: string;
  source: "imported" | "screen" | "camera";
  path: string | null;
  metadata: VideoMetadata | null;
  startTime: number;
  endTime: number;
  aiMutedPath?: string | null; // For AI-processed audio
}

export interface Project {
  mainTrack: VideoTrack;
  overlayTrack?: VideoTrack; // optional PiP camera layer
}

interface ProjectStore {
  // Project data
  project: Project | null;

  // Workflow state
  currentWorkflow: 'welcome' | 'import' | 'screen' | 'overlay' | null;

  // Processing state
  isProcessing: boolean;
  progress: number;

  // Timeline state
  currentTime: number;
  timelineZoom: number;
  playbackSpeed: number;
  exportResolutionScale: number;

  // Recording state
  isRecordingScreen: boolean;
  isRecordingCamera: boolean;
  recordingStartTime: number | null;

  // Actions
  setProject: (project: Project | null) => void;
  setWorkflow: (workflow: 'welcome' | 'import' | 'screen' | 'overlay' | null) => void;
  updateTrack: (type: "main" | "overlay", updates: Partial<VideoTrack>) => void;
  setMainTrack: (track: VideoTrack) => void;
  setOverlayTrack: (track: VideoTrack | null) => void;
  setProcessing: (processing: boolean) => void;
  setProgress: (progress: number) => void;
  setCurrentTime: (time: number) => void;
  setTimelineZoom: (zoom: number) => void;
  setPlaybackSpeed: (speed: number) => void;
  setExportResolutionScale: (scale: number) => void;
  setRecordingScreen: (recording: boolean) => void;
  setRecordingCamera: (recording: boolean) => void;
  setRecordingStartTime: (time: number | null) => void;
  reset: () => void;
}

export const useProjectStore = create<ProjectStore>((set, get) => ({
  // Initial state
  project: null,
  currentWorkflow: 'welcome',
  isProcessing: false,
  progress: 0,
  currentTime: 0,
  timelineZoom: 1.0,
  playbackSpeed: 1.0,
  exportResolutionScale: 1.0,
  isRecordingScreen: false,
  isRecordingCamera: false,
  recordingStartTime: null,

  // Actions
  setProject: (project) => set({ project }),
  setWorkflow: (workflow) => set({ currentWorkflow: workflow }),
  
  updateTrack: (type, updates) => {
    const { project } = get();
    if (!project) return;
    
    if (type === "main") {
      set({
        project: {
          ...project,
          mainTrack: { ...project.mainTrack, ...updates }
        }
      });
    } else if (type === "overlay" && project.overlayTrack) {
      set({
        project: {
          ...project,
          overlayTrack: { ...project.overlayTrack, ...updates }
        }
      });
    }
  },

  setMainTrack: (track) => {
    const { project } = get();
    if (project) {
      set({
        project: {
          ...project,
          mainTrack: track
        }
      });
    } else {
      // Create new project with main track
      set({
        project: {
          mainTrack: track,
          overlayTrack: undefined
        }
      });
    }
  },

  setOverlayTrack: (track) => {
    const { project } = get();
    if (project) {
      set({
        project: {
          ...project,
          overlayTrack: track || undefined
        }
      });
    }
  },

  setProcessing: (processing) => set({ isProcessing: processing }),
  setProgress: (progress) => set({ progress }),
  setCurrentTime: (time) => set({ currentTime: time }),
  setTimelineZoom: (zoom) => set({ timelineZoom: zoom }),
  setPlaybackSpeed: (speed) => set({ playbackSpeed: speed }),
  setExportResolutionScale: (scale) => set({ exportResolutionScale: scale }),
  setRecordingScreen: (recording) => set({ isRecordingScreen: recording }),
  setRecordingCamera: (recording) => set({ isRecordingCamera: recording }),
  setRecordingStartTime: (time) => set({ recordingStartTime: time }),
  
  reset: () =>
    set({
      project: null,
      currentWorkflow: 'welcome',
      isProcessing: false,
      progress: 0,
      currentTime: 0,
      timelineZoom: 1.0,
      playbackSpeed: 1.0,
      exportResolutionScale: 1.0,
      isRecordingScreen: false,
      isRecordingCamera: false,
      recordingStartTime: null,
    }),
}));
