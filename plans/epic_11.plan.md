# 🖥️ Epic 11 — Screen-Only Recording Flow (Updated Plan)

## Goal

Implement a reliable screen-only recording workflow that supports optional microphone narration.

Recordings must:

1. Capture screen video (+system audio when available)
2. Optionally capture microphone audio separately
3. Merge the two tracks using FFmpeg after recording
4. Auto-import the final merged file into the video editor (Epic 10)

---

## Current State Summary

- `ScreenRecordingEditor.tsx` already handles source selection, preview, and record start/stop.
- Recordings save to disk and load into the editor.
- System audio capture is inconsistent across platforms (Linux often fails).
- Mic input support is missing.

---

## Implementation Tasks

### 1️⃣ Add Microphone Device Selector

**File:** `src/components/MicrophoneSelector.tsx` (new)

Create a dropdown to select audio input devices.

```typescript
export interface MicrophoneSelectorProps {
  enabled: boolean;
  selectedDeviceId: string | null;
  onEnabledChange: (enabled: boolean) => void;
  onDeviceChange: (deviceId: string | null) => void;
  disabled?: boolean;
}
```

**Implementation details**

- Use `navigator.mediaDevices.enumerateDevices()` → filter `kind === 'audioinput'`
- Show “Default Microphone” option
- Preselect first available device on mount
- Toggle to enable/disable mic recording

---

### 2️⃣ Update `ScreenRecorder.tsx` to Use Separate Recorders

**File:** `src/components/ScreenRecorder.tsx`

**Changes**

1. Capture screen video + (optional system audio) via:

   ```typescript
   const screenStream = await navigator.mediaDevices.getDisplayMedia({
     video: true,
     audio: true,
   });
   ```

2. If mic enabled, capture microphone separately:

   ```typescript
   const micStream = await navigator.mediaDevices.getUserMedia({
     audio: {
       deviceId: microphoneDeviceId || undefined,
       echoCancellation: true,
       noiseSuppression: true,
     },
   });
   ```

3. Create two MediaRecorders:

   ```typescript
   const screenRecorder = new MediaRecorder(screenStream, {
     mimeType: "video/webm;codecs=vp8,opus",
   });
   const micRecorder = micStream
     ? new MediaRecorder(micStream, { mimeType: "audio/webm;codecs=opus" })
     : null;
   ```

4. Save each recorder’s blob on stop → `ipcClient.saveRecording()`
5. After both complete, invoke a new IPC merge command:

```typescript
await ipcClient.mergeAudioVideo({
  videoPath: screenPath,
  audioPath: micPath,
  outputFilename: `screen_with_mic_${Date.now()}.webm`,
});
```

**Backend (FFmpeg)**

```bash
ffmpeg -i screen.webm -i mic.webm \
  -filter_complex "[0:a][1:a]amix=inputs=2:duration=shortest" \
  -c:v copy -shortest output_with_mic.webm
```

---

### 3️⃣ Update `ScreenRecordingEditor.tsx` UI

**File:** `src/components/ScreenRecordingEditor.tsx`

- Insert `MicrophoneSelector` below `SourceSelector`.
- Track `micEnabled` and `micDeviceId` in local state.
- Pass these props to `ScreenRecorder.startRecording(micDeviceId?)`.
- Show “Recording with microphone” status when active.

```tsx
<div className="flex items-center gap-4">
  <label>Microphone:</label>
  <MicrophoneSelector
    enabled={micEnabled}
    selectedDeviceId={micDeviceId}
    onEnabledChange={setMicEnabled}
    onDeviceChange={setMicDeviceId}
    disabled={isRecording}
  />
</div>
```

---

### 4️⃣ Integrate Post-Recording Merge Flow

- After both recorders finish saving, call `mergeAudioVideo()` (IPC).
- Once the merged file is ready → `useVideoStore.importVideo(finalPath)` to open in editor.
- Display “Processing recording…” while merging.

---

### 5️⃣ Improve Error Handling

- If no audio tracks detected in `screenStream`, log a warning and record video only.
- If FFmpeg merge fails, fallback to screen-only file.
- Always clean up streams and recorders in finally blocks.

---

## Files to Modify / Add

1. `src/components/MicrophoneSelector.tsx` (new)
2. `src/components/ScreenRecorder.tsx` (update for dual recorders)
3. `src/components/ScreenRecordingEditor.tsx` (update for UI and logic)
4. `src/main/ipc/recording.ts` (new mergeAudioVideo handler)

---

## Testing Checklist

- [ ] Screen sources detected and selectable
- [ ] Microphones enumerated and selectable
- [ ] Video-only recording works (video + system audio if available)
- [ ] Video + mic recording produces two temporary files → merged into one
- [ ] Merged output has both video and mixed audio tracks
- [ ] Recording auto-imports into editor (Epic 10)
- [ ] Error messages appear when audio unavailable
- [ ] Streams stop cleanly without memory leaks

---

## Key Design Decisions

1. **Two MediaRecorders, not one:** avoids browser-level audio mixing issues.
2. **FFmpeg merge via IPC:** guarantees valid WebM containers and sync.
3. **Optional microphone:** UX remains simple for screen-only recordings.
4. **Auto-redirect to editor:** same post-recording flow as Epic 10.
5. **Resilient on Linux:** continues recording even if system audio unavailable.
