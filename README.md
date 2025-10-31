# ClipForge - AI-Powered Short-Form Clip Editor

## Overview

ClipForge is a **desktop video editing application** designed to help content creators identify and extract engaging short-form clips from longer videos. Built with Electron, React, and FFmpeg, it uses AI to analyze your video transcripts and suggest the most clip-worthy moments for TikTok, YouTube Shorts, Instagram Reels, and similar platforms.

**Perfect for:**

- Content creators who want to repurpose long-form content into shorts
- Finding the best moments from podcast episodes, live streams, or tutorials
- Quickly identifying viral-worthy segments from your content library

**Workflow:**

1. Import a longer video (1+ minutes)
2. AI analyzes the transcript and suggests engaging 1-3 sentence clips
3. Click suggestions to preview and automatically set trim points
4. Edit, adjust speed/resolution, and export your short clips

## Quick Start

**For Content Creators:**

1. **Set your OpenAI API key:**

   ```bash
   export OPENAI_API_KEY="your-api-key-here"
   ```

2. **Launch the app and import your video:**

   - Click "Import Video" from the welcome screen
   - Select your long-form video file

3. **Get AI suggestions:**

   - Click the "AI Short Suggestion" section below the timeline
   - Run through the 4-step process:
     - Extract Audio
     - Whisper Transcription
     - Segment Transcript
     - AI Short Suggestions
   - Review the color-coded suggestions (green = best)

4. **Preview and export:**
   - Click any suggestion to automatically jump to that moment
   - Trim range updates automatically
   - Adjust speed/resolution as needed
   - Export your short clip!

## Features

### 🎯 AI-Powered Short Detection (Primary Feature)

**AI Short Suggestions** - The core feature that makes ClipForge unique:

- **Smart Analysis**: Uses OpenAI Whisper for word-level transcription with precise timestamps
- **Engagement Scoring**: GPT-4.1-mini analyzes your transcript to identify 1-3 sentence clips with the most potential for short-form content
- **Quality Ranking**: Suggestions are scored (0-100%) and color-coded:
  - 🟢 **Green (≥75%)**: High-quality clips worth exporting
  - 🟡 **Yellow (50-74%)**: Decent clips worth reviewing
  - ⚪ **Gray (<50%)**: Lower priority, but still available
- **Interactive Workflow**:
  - Click any suggestion to automatically seek to that moment in the video
  - Trim range updates automatically with 0.5s buffer for smooth edits
  - See AI reasoning for why each clip was suggested
- **Batch Processing**: Handles long videos efficiently by processing in manageable chunks

**How It Works:**

1. Extract audio from your video (16kHz mono WAV for optimal transcription)
2. Whisper transcribes with word-level timestamps
3. Transcript is segmented into sentences based on punctuation and pauses
4. GPT analyzes each segment and identifies the most engaging moments for shorts
5. Suggestions appear with timestamps, scores, and reasoning

### ✅ Core Video Editing Functionality

- **Import Video** - Open file picker to select video files (MP4, AVI, MOV, MKV, WebM)
- **Professional Video Player** - Large preview window with native HTML5 controls
- **Interactive Timeline** - Drag-to-scrub playhead with visual trim handles for precise selection
- **Speed Control** - Adjust playback speed from 0.5x to 2x (affects both preview and export)
- **Resolution Scaling** - Export at custom resolutions (25% to 200% of original with proportional scaling)
- **Export Video** - Save trimmed clips with real-time progress tracking, ETA, and speed indicators
- **Welcome Screen** - Entry point with workflow selection (Import, Screen Recording, Screen + Overlay)
- **Screen Recording** - Record your screen with microphone input and source selection
- **Picture-in-Picture** - Overlay camera feed on screen recordings with FFmpeg post-processing
- **Audio Merging** - Combine screen and microphone audio streams

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

## Setup & Requirements

### API Key Requirement

The AI Short Suggestions feature requires your `OPENAI_API_KEY` to be set in your environment variables. The app uses this key to call OpenAI's Whisper and GPT-4.1-mini APIs for transcription and analysis.

```bash
export OPENAI_API_KEY="your-api-key-here"
```

**API Costs:**

- Whisper transcription is charged per minute of audio
- GPT-4.1-mini analysis is very affordable (~$0.01-0.05 per video depending on length)
- See [OpenAI Pricing](https://openai.com/pricing) for current rates

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
│   ├── types.ts             # TypeScript type definitions
│   ├── ipcHandlers/
│   │   ├── clipVideo.ts     # FFmpeg trim command handler
│   │   ├── exportVideo.ts   # Video export handler
│   │   ├── recordingHandlers.ts  # Screen recording & PiP handlers
│   │   └── aiHandlers.ts    # AI processing handlers (Whisper, GPT)
│   ├── ffmpeg/
│   │   └── runFFmpeg.ts     # Helper to spawn FFmpeg process
│   └── scripts/
│       └── afterPack.cjs    # Post-build script for FFmpeg bundling
│
├── src/
│   ├── components/
│   │   ├── WelcomeScreen.tsx         # Entry point workflow selector
│   │   ├── ImportVideoEditor.tsx     # Main video editing workspace
│   │   ├── ScreenRecordingEditor.tsx # Screen recording workflow
│   │   ├── ScreenOverlayEditor.tsx  # Screen + camera overlay workflow
│   │   ├── AIProcessor.tsx           # AI Short Suggestions component
│   │   ├── VideoPlayer.tsx           # Video preview component
│   │   ├── VideoPlayerWithControls.tsx
│   │   ├── ResolutionControls.tsx   # Resolution scaling UI
│   │   ├── ExportDialog.tsx          # Export dialog with progress
│   │   ├── SettingsPanel.tsx        # Settings and controls
│   │   ├── timeline/
│   │   │   ├── Timeline.tsx
│   │   │   ├── TimeRuler.tsx
│   │   │   ├── VideoTrack.tsx
│   │   │   ├── Playhead.tsx
│   │   │   └── TimelineControls.tsx
│   │   └── ui/                      # shadcn/ui components
│   ├── store/
│   │   └── useProjectStore.ts        # Zustand state management
│   ├── services/
│   │   ├── ipcClient.ts             # Wrapper for calling IPC events
│   │   └── previewService.ts        # Preview video service
│   └── App.tsx                      # Main app component with routing
│
├── bin/
│   └── linux/
│       ├── ffmpeg                   # Bundled FFmpeg binary
│       └── ffprobe                  # Bundled FFprobe binary
│
├── assets/
│   └── icons/
│       └── png/                     # App icons (16x16 to 512x512)
│
├── electron-builder.json5            # Build configuration
├── package.json
└── README.md

```

---

## IPC Channels

The app uses secure IPC communication with a channel whitelist. Available channels:

**Video Operations:**

- `video.import` - Open file dialog and import video
- `video.clip` - Trim video with FFmpeg
- `video.export` - Export video with progress tracking

**Recording Operations:**

- `recording.getSources` - Get available screen sources
- `recording.showSourceDialog` - Show source selection dialog
- `recording.saveFile` - Save recording buffer
- `recording.getMetadata` - Get video metadata
- `recording.convertWebmToMp4` - Convert WebM to MP4
- `recording.mergeAudioVideo` - Merge audio and video streams
- `recording.mergePiP` - Merge Picture-in-Picture video

**AI Operations:**

- `ai.extractAudio` - Extract audio for transcription
- `ai.whisperTranscription` - Transcribe audio with Whisper
- `ai.segmentTranscript` - Segment transcript into sentences
- `ai.gptShortSuggestions` - Get AI short clip suggestions
- `ai.cleanupTempFiles` - Clean up temporary files

**Other:**

- `dialog.showSaveDialog` - Show save file dialog
- `file.copyFile` - Copy file operations

**Events:**

- `ffmpeg.progress` - Real-time FFmpeg progress updates

## Example IPC Flow

**Renderer → Main Process**

```ts
// src/services/ipcClient.ts
export const ipcClient = {
  async importVideo() {
    return await window.api.invoke("video.import");
  },

  async clipVideo(params: ClipVideoRequest) {
    return await window.api.invoke("video.clip", params);
  },

  async whisperTranscription(params: { audioPath: string }) {
    return await window.api.invoke("ai.whisperTranscription", params);
  },
};
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

Trim with proportional resolution scaling (50% scale):

```bash
ffmpeg -ss 10 -to 25 -i input.mp4 -vf "scale=trunc(iw*0.5/2)*2:trunc(ih*0.5/2)*2" -c:a copy output.mp4
```

Same resolution (no scaling, fast copy):

```bash
ffmpeg -ss 10 -to 25 -i input.mp4 -c copy output.mp4
```

Extract audio for transcription (16kHz mono WAV):

```bash
ffmpeg -y -i input.mp4 -vn -ar 16000 -ac 1 -c:a pcm_s16le output.wav
```

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

- **Linux**: `clipforge-0.2.0-linux-x64.AppImage` and `clipforge-0.2.0-linux-x64.deb`
- **Windows**: `clipforge-0.2.0-win-x64.exe` (NSIS installer) and `clipforge-0.2.0-win-x64-portable.exe`
- **macOS**: `clipforge-0.2.0-mac-x64.dmg`

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

## 📚 How We Pivoted (Lessons Learned)

ClipForge started with a different goal: automatically removing filler words like "uh" and "um" from videos. That feature failed spectacularly, but we learned valuable lessons that led to the successful AI Short Suggestions feature.

**The Original Plan (Why It Failed):**

- Attempted to use Whisper + GPT to detect and mute filler words
- Problem: Whisper naturally removes disfluencies during transcription, so GPT received "clean" text and incorrectly identified important words as fillers
- Result: The feature muted important words, making audio unintelligible!

**The Pivot (Why It Works):**

- Instead of trying to fix filler word detection, we pivoted to a completely different use case: identifying engaging moments for short-form content
- Same AI pipeline (Whisper + GPT), completely different purpose
- The transcription quality that broke filler detection actually works perfectly for finding clip-worthy moments
- User interaction (clicking suggestions to preview) provides validation and value

**Key Takeaways:**

- Sometimes pivoting to a new use case works better than fixing the original approach
- Understanding API limitations and behaviors is crucial (Whisper removes fillers, that's a feature, not a bug)
- User feedback loops (interactive suggestions) help validate AI quality
- Combining AI analysis with manual editing tools provides the best experience

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
- [x] Welcome screen with workflow navigation
- [x] AI Short Suggestions pipeline (Whisper + GPT for identifying clip-worthy moments)
- [x] Interactive AI suggestions with video seeking integration

### 📝 Historical Note: Original AI Feature

The app originally attempted to build an "AI Filler Word Removal" feature, but it failed because Whisper naturally removes disfluencies during transcription. This led to misidentification of important words as fillers. We pivoted to the current AI Short Suggestions feature, which uses the same Whisper/GPT pipeline successfully for a completely different purpose. The old filler word removal code remains in the codebase but is not recommended for use.

---

## License

MIT License © 2025 ClipForge Project
