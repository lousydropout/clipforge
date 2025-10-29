# Replace Recording System with react-media-recorder

## Problem

The current custom MediaRecorder implementation has persistent issues with corrupted WebM files due to event handler timing problems. Multiple fix attempts have failed.

## Solution

Replace the entire recording system with `react-media-recorder`, which:

- Handles MediaRecorder event timing correctly
- Provides valid media blobs automatically
- Simplifies the recording flow
- Uses browser's native screen picker (reliable UX)

## Implementation Steps

### 1. Install Dependencies

- Add `react-media-recorder` package

### 2. Create New Recording Components

- **ScreenRecorder component**: Wraps `useReactMediaRecorder` for screen recording
- **CameraRecorder component**: Wraps `useReactMediaRecorder` for camera recording
- Both components will:
- Handle start/stop recording
- Fetch blob from `mediaBlobUrl` when recording stops
- Send blob to IPC handler for saving
- Update project store with saved video path

### 3. Update RecordingControls Component

Replace the current implementation in `src/components/RecordingControls.tsx`:

- Remove dependency on `recordingService`
- Use the new ScreenRecorder and CameraRecorder components
- Maintain the same UI/UX (start/stop buttons, duration display)
- Keep the recording state management in zustand store

### 4. Clean Up Old Code

- Delete `src/services/recordingService.ts` (no longer needed)
- Remove `recording.getSources` IPC handler (browser picker replaces this)
- Keep `recording.saveFile`, `recording.getMetadata`, and `recording.convertWebmToMp4` IPC handlers (still needed)
- Update `electron/ipcHandlers/recordingHandlers.ts` to remove unused handlers

### 5. Test Recording Flow

- Verify screen recording works and saves valid files
- Verify camera recording works and saves valid files
- Verify both recordings can run simultaneously
- Verify recordings integrate with project store correctly

## Files to Modify

- `package.json` - add react-media-recorder
- `src/components/RecordingControls.tsx` - complete rewrite using new library
- `electron/ipcHandlers/recordingHandlers.ts` - remove getSources handler
- `electron/main.ts` - remove getSources IPC registration
- `src/services/ipcClient.ts` - remove getSources method

## Files to Delete

- `src/services/recordingService.ts` - replaced by react-media-recorder

## Trade-offs

- ✅ **Gain**: Reliable recording without corruption
- ✅ **Gain**: Simpler, more maintainable code
- ⚠️ **Trade-off**: Use browser's screen picker instead of custom Electron UI (acceptable per user)
