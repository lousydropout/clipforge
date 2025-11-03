# Epic 7: Recording System (Screen + Camera)

## Overview

Add screen and camera recording capabilities to Screenshare Assist, enabling users to record directly into the two-track system. Users can choose to record screen only, camera only, or both simultaneously via a dropdown menu in the header.

## Key Files to Create

### 1. Recording Service (Renderer)

**File**: `src/services/recordingService.ts`

Create a service to handle MediaRecorder operations:

- `recordScreen()` - Uses desktopCapturer + getUserMedia for screen capture
- `recordCamera()` - Uses getUserMedia for camera/audio capture
- `stopRecording()` - Stops active MediaRecorder and returns blob
- `saveRecording()` - Saves blob to temp file via IPC

Key implementation details:

```typescript
// Get screen sources using desktopCapturer
const sources = await window.api.invoke("recording.getSources");
// User selects source from Electron's picker
const stream = await navigator.mediaDevices.getUserMedia({
  audio: { mandatory: { chromeMediaSource: "desktop" } },
  video: {
    mandatory: { chromeMediaSource: "desktop", chromeMediaSourceId: sourceId },
  },
});
const recorder = new MediaRecorder(stream, {
  mimeType: "video/webm;codecs=vp9",
});
```

### 2. Recording IPC Handlers (Main Process)

**File**: `electron/ipcHandlers/recordingHandlers.ts`

Implement IPC handlers for recording operations:

- `recording.getSources` - Returns desktopCapturer sources for user selection
- `recording.saveFile` - Saves blob buffer to temp directory, returns file path
- `recording.getMetadata` - Extracts metadata from recorded file using FFprobe

### 3. Recording Controls Component

**File**: `src/components/RecordingControls.tsx`

Create UI component with shadcn/ui DropdownMenu:

- Dropdown trigger button "Start Recording"
- Menu items: "Screen Only", "Camera Only", "Both"
- Recording status indicators (red dot, timer)
- Stop buttons for active recordings
- Integration with useProjectStore

### 4. Update Store for Recording State

**File**: `src/store/useProjectStore.ts`

Add recording state management:

```typescript
interface ProjectStore {
  // ... existing fields
  isRecordingScreen: boolean;
  isRecordingCamera: boolean;
  recordingStartTime: number | null;

  // Actions
  setRecordingScreen: (recording: boolean) => void;
  setRecordingCamera: (recording: boolean) => void;
  setRecordingStartTime: (time: number | null) => void;
}
```

### 5. Update IPC Bridge

**Files**: `electron/preload.ts`, `electron/main.ts`

Add new IPC channels to whitelist:

- `recording.getSources`
- `recording.saveFile`
- `recording.getMetadata`

Register handlers in main.ts:

```typescript
ipcMain.handle("recording.getSources", async () => handleGetSources());
ipcMain.handle("recording.saveFile", async (_, params) =>
  handleSaveFile(params)
);
ipcMain.handle("recording.getMetadata", async (_, path) =>
  getVideoMetadata(path)
);
```

### 6. Update IPC Client

**File**: `src/services/ipcClient.ts`

Add recording methods:

```typescript
async getSources(): Promise<DesktopCapturerSource[]>
async saveRecording(buffer: ArrayBuffer, filename: string): Promise<string>
async getRecordingMetadata(path: string): Promise<VideoMetadata>
```

### 7. TypeScript Types

**File**: `electron/types.ts`

Add recording-related interfaces:

```typescript
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
```

### 8. Update App.tsx

**File**: `src/App.tsx`

Integrate RecordingControls component in header next to Import Video button.

## Implementation Flow

### Recording Screen Only

1. User clicks "Start Recording" → "Screen Only"
2. Electron shows desktopCapturer source picker
3. User selects screen/window
4. MediaRecorder starts, UI shows recording indicator
5. User clicks "Stop Screen Recording"
6. Blob saved to temp file via IPC
7. FFprobe extracts metadata
8. `updateTrack("main", { path, metadata, startTime: 0, endTime: duration })`

### Recording Camera Only

1. User clicks "Start Recording" → "Camera Only"
2. Browser requests camera/mic permissions
3. MediaRecorder starts with video+audio stream
4. UI shows recording indicator
5. User clicks "Stop Camera Recording"
6. Blob saved to temp file via IPC
7. FFprobe extracts metadata
8. `updateTrack("overlay", { path, metadata, startTime: 0, endTime: duration })`

### Recording Both

1. User clicks "Start Recording" → "Both"
2. Start screen recording (with source picker)
3. Start camera recording (with permissions)
4. Both recorders run independently
5. User can stop each independently
6. Each saves to its respective track (main/overlay)

## Testing Checklist

- [ ] Screen recording creates valid .webm file
- [ ] Camera recording creates valid .webm file
- [ ] Both recordings can run simultaneously
- [ ] Recorded files have correct metadata (duration, resolution)
- [ ] mainTrack.path updates after screen recording
- [ ] overlayTrack.path updates after camera recording
- [ ] Recording indicators show correct state
- [ ] Stop buttons work correctly
- [ ] Temp files are saved to correct location
- [ ] Video player can play recorded files
- [ ] Timeline shows correct duration for recorded videos
- [ ] Export works with recorded videos

## Edge Cases to Handle

- User denies camera/screen permissions
- MediaRecorder not supported in browser
- Disk space issues when saving recordings
- User closes app during recording
- Recording fails mid-stream
- Metadata extraction fails for recorded file
- User tries to record when already recording
- User imports video while recording is active

## Success Criteria

✅ Users can record screen to mainTrack

✅ Users can record camera to overlayTrack

✅ Users can record both simultaneously

✅ Recorded .webm files are valid and playable

✅ Durations are roughly equal when recording both

✅ All existing trim/export functionality works with recorded videos

✅ UI clearly indicates recording state

✅ Proper error handling for all failure scenarios
