# Architecture - ClipForge Electron Prototype

## High-Level Architecture

```
┌─────────────────┐    IPC Events    ┌─────────────────┐
│   Renderer      │◄────────────────►│   Main Process  │
│   (React UI)    │                  │   (Electron)    │
└─────────────────┘                  └─────────────────┘
         │                                     │
         │                                     ▼
         │                            ┌─────────────────┐
         │                            │     FFmpeg      │
         │                            │   (CLI Process) │
         │                            └─────────────────┘
         │
         ▼
┌─────────────────┐
│   File System   │
│   (Video Files) │
└─────────────────┘
```

## Directory Structure

```
clipforge-electron/
├── electron/                    # Main process
│   ├── main.ts                 # Electron entry point
│   ├── preload.ts              # Secure IPC bridge
│   ├── ipcHandlers/            # IPC event handlers
│   │   ├── importVideo.ts      # Opens file dialog
│   │   ├── clipVideo.ts        # Runs FFmpeg trim command
│   │   └── exportVideo.ts      # (Optional) custom export logic
│   ├── ffmpeg/                 # FFmpeg utilities
│   │   └── runFFmpeg.ts        # Helper to spawn FFmpeg process
│   └── utils/                  # Utility functions
│       └── paths.ts            # Resolves app paths
├── src/                        # Renderer process
│   ├── components/             # React components
│   │   ├── VideoPlayer.tsx     # Video preview component
│   │   ├── TrimControls.tsx    # Time selection controls
│   │   └── ExportDialog.tsx    # Export settings dialog
│   ├── store/                  # Zustand state management
│   │   └── useVideoStore.ts    # Main store hook
│   ├── services/               # IPC service wrappers
│   │   ├── ipcClient.ts        # Wrapper for calling IPC events
│   │   └── ffmpeg.ts           # Frontend-side API stubs
│   └── App.tsx                 # Main React component
└── memory-bank/                # Project documentation
```

## IPC Communication

| Event             | Direction       | Purpose                                   |
| ----------------- | --------------- | ----------------------------------------- |
| `video.import`    | Renderer → Main | Open file dialog, return video path       |
| `video.clip`      | Renderer → Main | Execute FFmpeg trim command               |
| `video.export`    | Renderer → Main | Export trimmed video to selected location |
| `ffmpeg.progress` | Main → Renderer | Stream progress updates during processing |

## State Management (Zustand)

Key state properties:

- `videoPath`: string - Path to current video file
- `startTime`: number - Trim start timestamp (seconds)
- `endTime`: number - Trim end timestamp (seconds)
- `isProcessing`: boolean - FFmpeg operation in progress
- `progress`: number - Processing progress (0-100)

## Security Considerations

- Context isolation enabled
- Preload script provides secure IPC bridge
- No direct Node.js access from renderer process
- File operations restricted to user-selected paths
