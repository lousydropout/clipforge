# Epic 3: IPC Handlers & FFmpeg Integration

## Overview

Replace the mock IPC handlers in `electron/main.ts` with real FFmpeg-based video processing. The `video.import` handler is already functional with FFprobe metadata extraction, so we'll focus on implementing real video trimming and exporting.

## Implementation Steps

### 1. Create FFmpeg Utility Module

**File**: `electron/ffmpeg/runFFmpeg.ts`

Create a reusable FFmpeg utility that:

- Uses `child_process.spawn` to execute FFmpeg commands
- Parses stderr output for progress information
- Sends progress events to the renderer via IPC
- Returns a Promise that resolves on success or rejects on error
- Handles FFmpeg output parsing (time, speed, progress percentage)

Key features:

- Parse FFmpeg stderr lines like: `frame=123 fps=30 time=00:00:05.00 speed=1.5x`
- Calculate progress percentage based on duration
- Send `ffmpeg.progress` events with: `{ progress, time, speed, eta }`
- Proper error handling and cleanup

### 2. Create Video Clip Handler

**File**: `electron/ipcHandlers/clipVideo.ts`

Implement the video trimming logic:

- Accept parameters: `{ inputPath, outputPath, startTime, endTime, scaleToHeight? }`
- Build FFmpeg command with appropriate flags
- Use `-ss` for start time and `-to` for end time
- Use `-c copy` for fast copy when no scaling needed
- Use `-vf scale=-1:HEIGHT` when scaling is requested
- Call `runFFmpeg` utility and return result

FFmpeg command structure:

```bash
# Without scaling (fast copy)
ffmpeg -ss START -to END -i INPUT -c copy OUTPUT

# With scaling (re-encode)
ffmpeg -ss START -to END -i INPUT -vf scale=-1:HEIGHT -c:a copy OUTPUT
```

### 3. Create Export Handler

**File**: `electron/ipcHandlers/exportVideo.ts`

Implement the export workflow:

- Show save dialog for user to choose output location
- Generate output filename based on input (e.g., `video_trimmed.mp4`)
- Call `clipVideo` handler with selected parameters
- Return output path and success status

### 4. Update Main Process

**File**: `electron/main.ts`

Replace mock handlers:

- Remove mock `video.clip` handler (lines 125-132)
- Remove mock `video.export` handler (lines 134-162)
- Import and register real handlers from `ipcHandlers/`
- Keep existing `video.import` handler (already functional)
- Keep `getVideoMetadata` helper function

### 5. Add TypeScript Interfaces

**File**: `electron/types.ts` (new file)

Create shared type definitions:

- `FFmpegOptions` interface
- `VideoClipParams` interface
- `FFmpegProgressData` interface
- Export types for use across handlers

## File Structure

```
electron/
├── main.ts (updated)
├── preload.ts (no changes needed)
├── types.ts (new)
├── ffmpeg/
│   └── runFFmpeg.ts (new)
└── ipcHandlers/
    ├── clipVideo.ts (new)
    └── exportVideo.ts (new)
```

## Technical Considerations

1. **Progress Parsing**: FFmpeg outputs progress to stderr, need to parse lines carefully
2. **Error Handling**: FFmpeg can fail for many reasons (codec issues, disk space, etc.)
3. **Path Handling**: Ensure proper path escaping for FFmpeg commands
4. **Performance**: Use `-c copy` when possible to avoid re-encoding
5. **Cross-platform**: Commands should work on Linux, macOS, and Windows

## Success Criteria

- User can import a video and see real metadata
- User can set trim range and export to chosen location
- Progress bar updates in real-time during export
- Exported video plays correctly with trimmed duration
- Error messages display when FFmpeg fails
- No mock implementations remain in codebase
