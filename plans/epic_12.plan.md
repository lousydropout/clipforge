# Epic 12: Screen + Overlay Recording Flow

## Overview

Implement dual recording (screen + camera) with automatic FFmpeg PiP merging. After recording completes, the system will merge both videos into a single PiP video with the camera overlay positioned in the bottom-right corner at 1/4 scale, then load it into the editor.

## Current State

- `ScreenOverlayEditor.tsx` exists with dual recording setup (screen + camera)
- Both `ScreenRecorder` and `CameraRecorder` components are functional
- Dual recording saves two separate files (mainTrack and overlayTrack)
- Missing: PiP merging logic after recording completes

## Implementation Steps

### 1. Create PiP Merge IPC Handler

**File:** `electron/ipcHandlers/recordingHandlers.ts`

Add new function `handleMergePiP()` that uses FFmpeg to create Picture-in-Picture video:

```typescript
export async function handleMergePiP(params: {
  screenPath: string;
  cameraPath: string;
  outputFilename: string;
}): Promise<string>;
```

**FFmpeg command:**

```bash
ffmpeg -i screen.webm -i camera.webm \
  -filter_complex "[1:v]scale=iw/4:ih/4 [pip]; [0:v][pip] overlay=W-w-20:H-h-20" \
  -c:v libvpx-vp9 -c:a copy -shortest output_pip.webm
```

- Scale camera to 1/4 size
- Position at bottom-right with 20px padding
- Copy audio from screen recording (microphone audio)
- Use shortest stream duration

### 2. Register IPC Handler

**File:** `electron/main.ts`

Add handler registration:

```typescript
ipcMain.handle("recording.mergePiP", async (_, params) => {
  return await handleMergePiP(params);
});
```

Add to whitelist in preload.ts if needed.

### 3. Add IPC Client Method

**File:** `src/services/ipcClient.ts`

Add new method to ipcClient:

```typescript
async mergePiP(params: {
  screenPath: string;
  cameraPath: string;
  outputFilename: string;
}): Promise<string>
```

### 4. Update ScreenOverlayEditor Logic

**File:** `src/components/ScreenOverlayEditor.tsx`

Modify the recording completion flow:

**Current behavior:** Both recordings save to separate tracks (mainTrack + overlayTrack)

**New behavior:**

- Wait for both recordings to complete
- Call `ipcClient.mergePiP()` to create merged PiP video
- Load merged video into mainTrack only
- Clear overlayTrack (not needed after merge)
- Show "Processing PiP video..." status during merge
- Transition to editing phase with merged video

**Key changes:**

- Add state for tracking merge status: `isMergingPiP`
- Create `handleBothRecordingsComplete()` function that triggers after both screen and camera finish
- Update `handleScreenRecordingComplete()` and `handleCameraRecordingComplete()` to check if both are done
- Add merge logic with error handling and fallback

### 5. Update ScreenRecorder for Microphone Audio

**File:** `src/components/ScreenRecorder.tsx`

**Current:** `startRecording(microphoneDeviceId?: string)` accepts mic device but Epic 11 implementation already handles this

**Verify:** Ensure microphone audio is captured with screen recording (already implemented in Epic 11)

**No changes needed** - Epic 11 already has dual recording with microphone support

### 6. Update UI for PiP Status

**File:** `src/components/ScreenOverlayEditor.tsx`

Add status messages:

- "Recording screen and camera..." (during recording)
- "Processing PiP video..." (during merge)
- "PiP video ready!" (after merge complete)

Remove the "Picture-in-Picture Ready" card since merge happens automatically.

### 7. Error Handling

Add comprehensive error handling:

- If PiP merge fails, fallback to screen-only video
- Show user-friendly error messages via toast
- Clean up temporary files on error
- Log detailed error information for debugging

## Files to Modify

1. `electron/ipcHandlers/recordingHandlers.ts` - Add `handleMergePiP()`
2. `electron/main.ts` - Register PiP merge handler
3. `electron/preload.ts` - Whitelist handler if needed
4. `src/services/ipcClient.ts` - Add `mergePiP()` method
5. `src/components/ScreenOverlayEditor.tsx` - Implement merge logic and UI updates

## Testing Checklist

- [ ] Screen and camera sources can be selected
- [ ] Dual recording starts successfully
- [ ] Both recordings complete and save to temp files
- [ ] PiP merge creates valid video with camera overlay in bottom-right
- [ ] Camera overlay is scaled to 1/4 size with 20px padding
- [ ] Merged video has audio from screen recording (microphone)
- [ ] Merged video loads into editor after processing
- [ ] Error handling works if merge fails (fallback to screen-only)
- [ ] UI shows appropriate status messages during each phase
- [ ] Temporary files are cleaned up properly

## Technical Notes

**Why merge immediately after recording:**

- Simpler user experience - single video in editor
- Reduces complexity in timeline/export logic
- PiP configuration is fixed, so no need to keep separate tracks

**FFmpeg PiP Filter Breakdown:**

- `[1:v]scale=iw/4:ih/4 [pip]` - Scale camera (input 1) to 1/4 size, label as "pip"
- `[0:v][pip] overlay=W-w-20:H-h-20` - Overlay pip on screen (input 0) at bottom-right with 20px padding
- `-c:v libvpx-vp9` - VP9 codec for WebM (good quality/size balance)
- `-c:a copy` - Copy audio without re-encoding (from screen recording)
- `-shortest` - End when shortest stream ends (handles duration mismatches)

**Microphone Audio:**

- Captured during screen recording (Epic 11 implementation)
- Single microphone stream, not dual
- Audio automatically included in merged output via `-c:a copy`
