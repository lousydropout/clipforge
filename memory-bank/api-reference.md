# API Reference - Screenshare Assist

## IPC Events

### `video.import`

**Direction**: Renderer → Main  
**Purpose**: Open file dialog and return selected video path

**Request**:

```typescript
interface ImportVideoRequest {
  // No parameters - opens native file dialog
}
```

**Response**:

```typescript
interface ImportVideoResponse {
  success: boolean;
  videoPath?: string;
  error?: string;
  metadata?: {
    duration: number; // in seconds
    width: number;
    height: number;
    format: string;
  };
}
```

### `video.clip`

**Direction**: Renderer → Main  
**Purpose**: Execute FFmpeg trim command

**Request**:

```typescript
interface ClipVideoRequest {
  inputPath: string;
  outputPath: string;
  startTime: number; // in seconds
  endTime: number; // in seconds
  scaleToHeight?: number; // optional resolution scaling
}
```

**Response**:

```typescript
interface ClipVideoResponse {
  success: boolean;
  outputPath?: string;
  error?: string;
}
```

### `video.export`

**Direction**: Renderer → Main  
**Purpose**: Export trimmed video to user-selected location

**Request**:

```typescript
interface ExportVideoRequest {
  inputPath: string;
  startTime: number;
  endTime: number;
  scaleToHeight?: number;
}
```

**Response**:

```typescript
interface ExportVideoResponse {
  success: boolean;
  outputPath?: string;
  error?: string;
}
```

### `ffmpeg.progress`

**Direction**: Main → Renderer  
**Purpose**: Stream progress updates during FFmpeg operations

**Data**:

```typescript
interface FFmpegProgress {
  progress: number; // 0-100
  time: number; // current time in seconds
  speed: number; // processing speed multiplier
  eta: number; // estimated time remaining in seconds
}
```

## FFmpeg Commands

### Basic Trim (Same Resolution)

```bash
ffmpeg -ss 10 -to 25 -i input.mp4 -c copy output.mp4
```

### Trim with Resolution Scaling

```bash
ffmpeg -ss 10 -to 25 -i input.mp4 -vf "scale=-1:720" -c:a copy output.mp4
```

### Parameters

- `-ss`: Start time (format: HH:MM:SS or seconds)
- `-to`: End time (format: HH:MM:SS or seconds)
- `-i`: Input file path
- `-vf "scale=-1:<height>"`: Scale to specific height, maintain aspect ratio
- `-c:a copy`: Copy audio without re-encoding
- `-c copy`: Copy both video and audio without re-encoding

## Code Examples

### IPC Client (Renderer)

```typescript
// src/services/ipcClient.ts
export const importVideo = async () => window.api.invoke("video.import");
export const clipVideo = async (params) =>
  window.api.invoke("video.clip", params);
```

### IPC Handler (Main Process)

```typescript
// electron/ipcHandlers/clipVideo.ts
import { ipcMain } from "electron";
import { runFFmpeg } from "../ffmpeg/runFFmpeg";

ipcMain.handle(
  "video.clip",
  async (_, { inputPath, start, end, outputPath, scale }) => {
    const args = [
      "-ss",
      start.toString(),
      "-to",
      end.toString(),
      "-i",
      inputPath,
      ...(scale ? ["-vf", `scale=-1:${scale}`] : []),
      "-c:a",
      "copy",
      outputPath,
    ];
    return await runFFmpeg(args);
  }
);
```

### FFmpeg Helper

```typescript
// electron/ffmpeg/runFFmpeg.ts
import { spawn } from "child_process";

export function runFFmpeg(args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const ffmpeg = spawn("ffmpeg", args);

    ffmpeg.stderr.on("data", (data) => {
      console.log(`[FFmpeg] ${data}`);
    });

    ffmpeg.on("close", (code) => {
      if (code === 0) resolve("success");
      else reject(new Error(`FFmpeg exited with code ${code}`));
    });
  });
}
```

## State Store Interface (Zustand)

```typescript
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
  setVideoPath: (path: string) => void;
  setVideoMetadata: (metadata: VideoMetadata) => void;
  setStartTime: (time: number) => void;
  setEndTime: (time: number) => void;
  setProcessing: (processing: boolean) => void;
  setProgress: (progress: number) => void;
  reset: () => void;
}

interface VideoMetadata {
  duration: number;
  width: number;
  height: number;
  format: string;
  bitrate?: number;
  fps?: number;
}
```

## Error Handling

### Common Error Types

- `FILE_NOT_FOUND`: Input video file doesn't exist
- `INVALID_FORMAT`: Unsupported video format
- `FFMPEG_ERROR`: FFmpeg command failed
- `PERMISSION_DENIED`: Insufficient file system permissions
- `INVALID_TIME_RANGE`: Start time >= end time

### Error Response Format

```typescript
interface ErrorResponse {
  success: false;
  error: string;
  code?: string;
  details?: any;
}
```
