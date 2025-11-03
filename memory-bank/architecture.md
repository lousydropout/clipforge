# Architecture - Screenshare Assist

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
screenshare-assist/
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

## Implemented IPC Bridge

The secure IPC bridge is implemented in `electron/preload.ts`:

```typescript
contextBridge.exposeInMainWorld("api", {
  invoke: (channel: string, args?: any) => {
    const validChannels = ["video.import", "video.clip", "video.export"];
    if (validChannels.includes(channel)) {
      return ipcRenderer.invoke(channel, args);
    }
    throw new Error(`Invalid IPC channel: ${channel}`);
  },
  on: (channel: string, callback: Function) => {
    const validChannels = ["ffmpeg.progress"];
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, (_, data) => callback(data));
    }
  },
  off: (channel: string, callback: Function) => {
    const validChannels = ["ffmpeg.progress"];
    if (validChannels.includes(channel)) {
      ipcRenderer.off(channel, callback);
    }
  },
});
```

### TypeScript Interface

```typescript
interface Window {
  api: {
    invoke: (channel: string, args?: any) => Promise<any>;
    on: (channel: string, callback: Function) => void;
    off: (channel: string, callback: Function) => void;
  };
}
```

## State Management (Zustand)

Key state properties:

- `videoPath`: string - Path to current video file
- `startTime`: number - Trim start timestamp (seconds)
- `endTime`: number - Trim end timestamp (seconds)
- `isProcessing`: boolean - FFmpeg operation in progress
- `progress`: number - Processing progress (0-100)

## Security Considerations

- ✅ Context isolation enabled (`contextIsolation: true`)
- ✅ Node integration disabled (`nodeIntegration: false`)
- ✅ Remote module disabled (`enableRemoteModule: false`)
- ✅ Preload script provides secure IPC bridge with channel whitelist
- ✅ No direct Node.js access from renderer process
- ✅ File operations restricted to user-selected paths
- ✅ Type-safe API interface prevents runtime errors
