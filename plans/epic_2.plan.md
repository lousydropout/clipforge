# Epic 2: Frontend Interface Implementation

## Overview

Implement the complete React frontend with Zustand state management, video player, trim controls, and export dialog. This builds on the secure IPC bridge from Epic 1.

## Implementation Steps

### 1. State Management with Zustand

Create `src/store/useVideoStore.ts` with the following state:

- `videoPath: string | null` - Current video file path
- `startTime: number` - Trim start time in seconds (default: 0)
- `endTime: number` - Trim end time in seconds (default: 0)
- `isProcessing: boolean` - FFmpeg operation status
- `progress: number` - Processing progress 0-100
- Actions: `setVideoPath`, `setStartTime`, `setEndTime`, `setProcessing`, `setProgress`, `reset`

### 2. IPC Service Wrapper

Create `src/services/ipcClient.ts` to wrap the IPC bridge:

- `importVideo()` - Calls `window.api.invoke('video.import')`
- `clipVideo(params)` - Calls `window.api.invoke('video.clip', params)`
- `exportVideo(params)` - Calls `window.api.invoke('video.export', params)`
- `onProgress(callback)` - Listens to `ffmpeg.progress` events
- `offProgress(callback)` - Removes progress listener

### 3. shadcn/ui Components

Install needed shadcn/ui components:

- `button` - For import/export actions
- `input` - For time inputs
- `slider` - For timeline scrubbing
- `card` - For layout sections
- `progress` - For export progress display

### 4. Video Player Component

Create `src/components/VideoPlayer.tsx`:

- Uses native HTML5 `<video>` element
- Displays video from `videoPath` in store
- Shows placeholder when no video loaded
- Includes basic controls (play/pause)
- Updates current time for trim preview

### 5. Trim Controls Component

Create `src/components/TrimControls.tsx`:

- Two number inputs for start/end times (in seconds)
- Connected to Zustand store
- Validation: start < end, within video duration
- Display formatted time (HH:MM:SS)
- Optional: Timeline slider for visual selection

### 6. Export Dialog Component

Create `src/components/ExportDialog.tsx`:

- Trigger export button
- Progress bar during processing
- Success/error states
- Uses `isProcessing` and `progress` from store
- Calls `exportVideo()` from ipcClient

### 7. Main App Layout

Update `src/App.tsx`:

- Remove test/demo code
- Clean, modern layout with TailwindCSS
- Header with app title "Screenshare Assist"
- Import button (calls `importVideo()`)
- VideoPlayer component
- TrimControls component (only visible when video loaded)
- ExportDialog component (only enabled when video loaded and valid range)
- Error handling and user feedback

## Key Files to Create/Modify

**New Files:**

- `src/store/useVideoStore.ts` - Zustand store
- `src/services/ipcClient.ts` - IPC wrapper
- `src/components/VideoPlayer.tsx` - Video preview
- `src/components/TrimControls.tsx` - Time selection
- `src/components/ExportDialog.tsx` - Export UI
- `src/components/ui/` - shadcn/ui components (button, input, slider, card, progress)

**Modified Files:**

- `src/App.tsx` - Main application layout
- `src/App.css` - Remove demo styles, add app-specific styles

## Technical Considerations

- Use `window.api` interface from Epic 1 (already type-safe)
- All IPC calls should have try/catch error handling
- Video element should use `file://` protocol for local paths
- Time inputs should validate against video duration
- Progress updates should be throttled to avoid UI lag
- Clean up event listeners on component unmount

## Success Criteria

- User can click "Import Video" and select a file
- Video displays in player after import
- User can set start/end times via inputs
- User can click "Export" to trigger clip operation
- Progress bar shows during export
- Success message displays when complete
- All state updates work correctly via Zustand
- No console errors or TypeScript issues
