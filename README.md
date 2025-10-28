# ClipForge (Electron Prototype)

## Overview

This is a lightweight **Electron + React + FFmpeg** desktop app for basic video editing.  
The goal of this prototype is to test a clean import → trim → export flow, without project management or AI features.

---

## Core Features

1. **Import video** — open file picker and preview video.
2. **Select trim range** — specify start and end times.
3. **Export clip** — choose output folder, export at same or lower resolution.

---

## Tech Stack

| Layer                | Technology                            | Purpose               |
| -------------------- | ------------------------------------- | --------------------- |
| **Frontend**         | React + TypeScript + Zustand          | UI and local state    |
| **Desktop Shell**    | Electron + Vite                       | Desktop environment   |
| **Video Processing** | FFmpeg via Node `child_process.spawn` | Trim/export videos    |
| **Styling**          | TailwindCSS + shadcn/ui               | Components            |
| **Packaging**        | Electron Builder                      | Cross-platform builds |

---

## Folder Structure

```

clipforge-electron/
├── electron/
│   ├── main.ts              # Electron entry point
│   ├── preload.ts           # Secure IPC bridge
│   ├── ipcHandlers/
│   │   ├── importVideo.ts   # Opens file dialog
│   │   ├── clipVideo.ts     # Runs FFmpeg trim command
│   │   └── exportVideo.ts   # (Optional) custom export logic
│   ├── ffmpeg/
│   │   └── runFFmpeg.ts     # Helper to spawn FFmpeg process
│   └── utils/
│       └── paths.ts         # Resolves app paths
│
├── src/
│   ├── components/
│   │   ├── VideoPlayer.tsx
│   │   ├── TrimControls.tsx
│   │   └── ExportDialog.tsx
│   ├── store/
│   │   └── useVideoStore.ts
│   ├── services/
│   │   ├── ipcClient.ts     # Wrapper for calling IPC events
│   │   └── ffmpeg.ts        # Frontend-side API stubs
│   └── App.tsx
│
├── package.json
└── README.md

```

---

## Example IPC Flow

**Renderer → Main Process**

```ts
// src/services/ipcClient.ts
export const importVideo = async () => window.api.invoke("video.import");
export const clipVideo = async (params) =>
  window.api.invoke("video.clip", params);
```

**Main Process**

```ts
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

**FFmpeg Helper**

```ts
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

---

## Example FFmpeg Command

Trim video from 10s to 25s and resize to 720p:

```bash
ffmpeg -ss 10 -to 25 -i input.mp4 -vf "scale=-1:720" -c:a copy output.mp4
```

Same resolution (no scaling):

```bash
ffmpeg -ss 10 -to 25 -i input.mp4 -c copy output.mp4
```

---

## Development Setup

### Prerequisites

- Node.js ≥ 20
- FFmpeg installed and in PATH

### Commands

```bash
bun install
bun run dev
```

This launches both Vite (renderer) and Electron (main).

To build for distribution:

```bash
bun run build
bun run electron:build
```

---

## MVP Checklist

- [ ] Import and preview video
- [ ] Input start/end timestamps
- [ ] Run FFmpeg trim via IPC
- [ ] Export to chosen folder
- [ ] Display export progress in UI

---

## License

MIT License © 2025 ClipForge Project
