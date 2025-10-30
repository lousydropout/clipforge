# ClipForge - AI-Powered Video Editor (That Was The Goal)

## Overview

ClipForge was designed to be an **AI-powered video editing app that removes your filler words**. Built with Electron, React, and FFmpeg, it features a modern dark theme interface with an interactive timeline. However, the AI feature is catastrophically broken and makes your videos worse instead of better.

## 🚨 The AI Feature Disaster

### What It Was Supposed To Do

Automatically detect and mute filler words like "uh", "um", "like" in video audio to create cleaner, more professional content.

### What It Actually Does

Mutes important words, turning your audio into nonsensical gibberish! 🤡

### The Silly Example

**Original audio**: "Hey, I'm just here watching this YouTube video, give me a little, just saying a few words, and want to know how the AI will react."

**What Whisper transcribes**: "Hey, I'm here watching this YouTube video, give me a little, saying a few words, and want to know how the AI will react." (Notice: "just" and "just" are missing - Whisper filtered them out!)

**What GPT thinks are fillers**: "just", "little", "few" (because these words appear in the original but not in the cleaned text)

**What gets muted**: The words "just", "little", "few" - turning your sentence into gibberish!

**Result**: "Hey, I'm here watching this YouTube video, give me a , saying a words, and want to know how the AI will react." 🤡

### Why It's Broken

OpenAI Whisper ignores filler words during transcription, so GPT-4o-mini receives clean text and incorrectly identifies key words as "fillers". Classic case of "garbage in, garbage out"!

### API Key Requirement

The AI feature (broken as it is) requires your `OPENAI_API_KEY` to be set in your environment variables. The app will use this key to call OpenAI's Whisper and GPT-4o-mini APIs. Make sure to set it before running the application:

```bash
export OPENAI_API_KEY="your-api-key-here"
```

## ⚠️ WARNING: DO NOT USE THE AI FEATURE

The AI filler word removal feature is **DANGEROUS** and will make your videos worse. It mutes important words instead of filler words, creating nonsensical audio. Stick to the core video editing features only!

## Features

### ✅ Working Core Functionality

- **Import Video** - Open file picker to select video files (MP4, AVI, MOV, MKV, WebM)
- **Professional Video Player** - Large preview window with native HTML5 controls
- **Interactive Timeline** - Drag-to-scrub playhead with visual trim handles
- **Speed Control** - Adjust playback speed from 0.5x to 2x (affects both preview and export)
- **Resolution Scaling** - Export at custom resolutions (25% to 200% of original)
- **Export Video** - Save trimmed clips with real-time progress tracking
- **Screen Recording** - Record your screen with optional camera overlay
- **Picture-in-Picture** - Overlay camera feed on screen recordings
- **Audio Merging** - Combine screen and microphone audio

### ❌ Broken AI Feature (DO NOT USE)

- **AI Filler Word Removal** - Supposed to remove "uh", "um", "like" but actually removes important words, making your audio unintelligible

### User Experience

- **Dark Theme Interface** - Professional video editor appearance
- **Interactive Timeline** - Drag playhead to scrub, drag trim handles to adjust selection
- **Timeline Zoom** - Zoom in/out to focus on specific time ranges
- **Keyboard Shortcuts** - Quick access to common functions
- **Toast Notifications** - Clear feedback for all operations
- **Loading States** - Skeleton loaders and progress indicators
- **Error Handling** - Comprehensive validation and helpful error messages
- **Accessibility** - ARIA labels and keyboard navigation support

### Technical Features

- **Secure IPC** - Context isolation with channel whitelist
- **Real FFmpeg Integration** - Actual video processing with progress parsing
- **Speed Filters** - FFmpeg setpts/atempo filters for accurate speed changes
- **Bundled FFmpeg** - Self-contained Linux builds with static binaries
- **Type Safety** - Full TypeScript support throughout
- **Performance Optimized** - Memoized components and debounced inputs

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
│   │   ├── ResolutionControls.tsx
│   │   ├── ExportDialog.tsx
│   │   ├── SettingsPanel.tsx
│   │   ├── timeline/
│   │   │   ├── Timeline.tsx
│   │   │   ├── TimeRuler.tsx
│   │   │   ├── VideoTrack.tsx
│   │   │   ├── Playhead.tsx
│   │   │   └── TimelineControls.tsx
│   │   └── ui/              # shadcn/ui components
│   ├── store/
│   │   └── useVideoStore.ts
│   ├── services/
│   │   └── ipcClient.ts     # Wrapper for calling IPC events
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

## Example FFmpeg Commands

Trim video from 10s to 25s and resize to 720p:

```bash
ffmpeg -ss 10 -to 25 -i input.mp4 -vf "scale=-1:720" -c:a copy output.mp4
```

Trim with 2x speed increase:

```bash
ffmpeg -ss 10 -to 25 -i input.mp4 -filter_complex "[0:v]setpts=0.5*PTS[v];[0:a]atempo=2.0[a]" -map "[v]" -map "[a]" output.mp4
```

Same resolution (no scaling):

```bash
ffmpeg -ss 10 -to 25 -i input.mp4 -c copy output.mp4
```

---

## Keyboard Shortcuts

- `Ctrl/Cmd + O` - Import video
- `Ctrl/Cmd + E` - Export video
- `Space` - Play/pause video
- `Left/Right Arrow` - Adjust start time by 1 second
- `Up/Down Arrow` - Adjust end time by 1 second
- `Shift + Arrow Keys` - Adjust by 10 seconds
- `Mouse Drag` - Drag playhead to scrub timeline
- `Mouse Drag` - Drag trim handles to adjust selection

## Installation & Setup

### Prerequisites

- Node.js ≥ 20
- FFmpeg installed and in PATH
- Bun package manager (recommended) or npm

### Development

```bash
# Install dependencies
bun install

# Start development server
bun run dev
```

This launches both Vite (renderer) and Electron (main) with hot reload.

### Building for Distribution

```bash
# Build for current platform
bun run build

# Build for specific platforms
bun run build:linux    # Linux AppImage and DEB
bun run build:win      # Windows NSIS and portable (UNTESTED)
bun run build:mac      # macOS DMG (UNTESTED)

# Build without publishing
bun run dist
```

#### Build Output

The build process creates the following artifacts in the `dist/` directory:

- **Linux**: `ClipForge-0.1.0-linux-x64.AppImage` and `ClipForge-0.1.0-linux-x64.deb`
- **Windows**: `ClipForge-0.1.0-win-x64.exe` (NSIS installer) and `ClipForge-0.1.0-win-x64-portable.exe`
- **macOS**: `ClipForge-0.1.0-mac-x64.dmg`

#### FFmpeg Bundling

The application includes bundled FFmpeg binaries for Linux, eliminating the need for users to install FFmpeg separately. The binaries are automatically extracted and configured during the build process.

**Bundled FFmpeg Details:**

- Source: Static builds from johnvansickle.com
- License: GPL v3 (included in `bin/linux/`)
- Size: ~80MB per platform
- Architecture: x64 (AMD64)

#### Build Configuration

The build process is configured in `electron-builder.json5`:

- **App ID**: `com.clipforge.app`
- **Product Name**: `ClipForge`
- **Icons**: Multiple sizes (16x16 to 512x512) in `assets/icons/png/`
- **Output Directory**: `dist/`
- **Extra Resources**: FFmpeg binaries in `bin/linux/`

## FFmpeg Installation

### Linux (Ubuntu/Debian)

```bash
sudo apt update && sudo apt install ffmpeg
```

### macOS

```bash
brew install ffmpeg
```

### Windows

```bash
# Using Chocolatey
choco install ffmpeg

# Or download from https://ffmpeg.org/download.html
```

## Troubleshooting

### FFmpeg Not Found

- Ensure FFmpeg is installed and in your system PATH
- Run `ffmpeg -version` to verify installation
- Restart the application after installing FFmpeg

### Video Import Issues

- Check file format is supported (MP4, AVI, MOV, MKV, WebM)
- Verify file is not corrupted
- Ensure file permissions allow reading

### Export Failures

- Check available disk space
- Verify output directory permissions
- Ensure input file still exists and is accessible

## 📚 Lessons Learned

This project is a perfect example of why you should test AI features thoroughly before shipping. The AI doesn't just fail silently - it actively makes your content worse!

**Key takeaways:**

- Always understand API limitations before building features
- Whisper is designed to produce clean transcripts and naturally removes disfluencies
- "Garbage in, garbage out" applies especially to AI pipelines
- Test with real-world data, not just perfect examples
- Sometimes the simplest approach (manual editing) is better than AI

## Project Status

### ✅ Completed Working Features

- [x] Import and preview video
- [x] Professional dark theme interface
- [x] Interactive timeline with draggable playhead
- [x] Visual trim handles for precise selection
- [x] Timeline zoom controls (25% to 400%)
- [x] Playback speed control (0.5x to 2x)
- [x] Resolution scaling (25% to 200%)
- [x] Real FFmpeg integration with progress tracking
- [x] Speed filters (setpts/atempo) for accurate exports
- [x] Bundled FFmpeg binaries for Linux
- [x] Export to chosen folder with automatic scaling
- [x] Enhanced progress display with ETA and speed
- [x] Toast notifications for user feedback
- [x] Keyboard shortcuts and accessibility
- [x] Loading states and skeleton UI
- [x] Comprehensive error handling
- [x] Performance optimizations
- [x] Production build configuration
- [x] Screen recording with camera overlay
- [x] Picture-in-Picture functionality
- [x] Audio merging capabilities

### ❌ Catastrophically Broken Features

- [x] AI Filler Word Removal - Mutes important words instead of filler words, creating nonsensical audio

---

## License

MIT License © 2025 ClipForge Project
