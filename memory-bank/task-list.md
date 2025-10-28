# ClipForge Electron Prototype – Task Plan

## Goal

Build a lightweight Electron app that can:

- Import a local video
- Trim it via start/end timestamps
- Export it at the same or lower resolution using FFmpeg

No project system, no AI features — just a clean, working pipeline.

## Current Status

- ✅ **Epic 1 Complete**: Electron shell with secure IPC bridge
- ✅ **Epic 2 Complete**: Frontend Interface (React + Zustand)
- ✅ **Epic 3 Complete**: IPC Handlers & FFmpeg Integration
- 🚧 **Epic 4 Next**: UX/Progress & Packaging
- ⏳ **Epic 5-6 Pending**: Packaging & Distribution

---

## Epic 1: Electron Shell Setup ✅ COMPLETED

### Story 1.1 – Initialize Electron + React Environment ✅

- [x] Create project using `electron-vite` or `vite + electron-builder`
- [x] Configure entry files: `electron/main.ts`, `preload.ts`, `src/index.html`
- [x] Add `tsconfig.json` for both main and renderer
- [x] Set up hot reload for dev mode (`bun run dev`)
- [x] Add `.env` variables for FFmpeg path, if needed (not needed - FFmpeg in PATH)

### Story 1.2 – Secure IPC Bridge ✅

- [x] Enable `contextIsolation` in Electron
- [x] Implement `preload.ts` to safely expose APIs:

  ```ts
  contextBridge.exposeInMainWorld("api", {
    invoke: (channel, args) => ipcRenderer.invoke(channel, args),
  });
  ```

- [x] Restrict IPC access to allowed channels (`video.import`, `video.clip`, `video.export`)
- [x] Add TypeScript definitions for `window.api` interface
- [x] Implement channel whitelist for security
- [x] Add proper error handling for invalid channels

### Epic 1 Completion Summary ✅

- **Security**: Context isolation enabled, node integration disabled
- **IPC Bridge**: Secure channel whitelist implemented
- **TypeScript**: Full type safety for renderer process
- **Development**: Hot reload working, dev server running
- **Files Modified**: `main.ts`, `preload.ts`, `electron-env.d.ts`, `App.tsx`

---

## Epic 2: Frontend Interface (React + Zustand) ✅ COMPLETED

### Story 2.1 – UI Scaffolding ✅

- [x] Create base layout in `App.tsx`
- [x] Add TailwindCSS and shadcn/ui setup
- [x] Implement `<VideoPlayer />` for preview using native `<video>` tag
- [x] Implement `<TrimControls />` for start/end inputs
- [x] Implement `<ExportDialog />` for save path + scale choice

### Story 2.2 – State Management ✅

- [x] Create Zustand store `useVideoStore.ts`:

  ```ts
  interface VideoState {
    videoPath: string | null;
    startTime: number;
    endTime: number;
    isProcessing: boolean;
    progress: number;
  }
  ```

- [x] Actions: `setVideoPath`, `setStartTime`, `setEndTime`, `setProcessing`, `setProgress`, `reset()`

### Story 2.3 – User Flow Integration ✅

- [x] Import → preview video path
- [x] Adjust start/end → show markers
- [x] Export → trigger IPC handler → display progress

### Epic 2 Completion Summary ✅

- **UI Components**: Complete video player, trim controls, and export dialog
- **State Management**: Zustand store with all video state and actions
- **IPC Integration**: Type-safe IPC client wrapper for all video operations
- **Real Metadata**: FFprobe integration for actual video metadata extraction
- **Mock Handlers**: Working mock implementations for testing UI functionality
- **Responsive Design**: Clean, modern UI with TailwindCSS and shadcn/ui
- **Error Handling**: Comprehensive error states and user feedback

---

## Epic 3: IPC Handlers & FFmpeg Integration ✅ COMPLETED

### Story 3.1 – FFmpeg Utility Module ✅

- [x] Create `electron/ffmpeg/runFFmpeg.ts`

  - Use `child_process.spawn` for FFmpeg execution
  - Parse stderr lines for progress information
  - Send `ffmpeg.progress` IPC events to renderer
  - Handle both fast copy and re-encoding with scaling

### Story 3.2 – Video Clip Handler ✅

- [x] Create `electron/ipcHandlers/clipVideo.ts`

  - Accept `{ inputPath, start, end, outputPath, scale }`
  - Call `runFFmpeg.ts` utility
  - Validate input parameters
  - Return success/error status

### Story 3.3 – Export Handler ✅

- [x] Create `electron/ipcHandlers/exportVideo.ts`

  - Show save dialog for output location
  - Generate smart default filenames
  - Call `clipVideo` handler with parameters
  - Return output path and status

### Story 3.4 – TypeScript Interfaces ✅

- [x] Create `electron/types.ts`

  - `FFmpegOptions` interface
  - `VideoClipParams` interface
  - `FFmpegProgressData` interface
  - `FFmpegResult` interface

### Story 3.5 – Main Process Integration ✅

- [x] Update `electron/main.ts`

  - Replace mock handlers with real implementations
  - Import and register new handler modules
  - Maintain existing `video.import` functionality

### Epic 3 Completion Summary ✅

- **Real FFmpeg Integration**: Complete video processing pipeline
- **Progress Tracking**: Real-time progress updates during export
- **Command Generation**: Smart FFmpeg commands for different scenarios
- **Error Handling**: Comprehensive error handling throughout
- **Type Safety**: Full TypeScript support with proper interfaces
- **Testing**: Successfully tested with real video files

---

## Epic 4: UX and Progress Feedback

---

## Epic 5: UX and Progress Feedback

### Story 5.1 – Progress Display

- [ ] Listen for `ffmpeg.progress` event from main process
- [ ] Show progress bar / spinner in ExportDialog
- [ ] Handle success/failure UI states

### Story 5.2 – File Validation and Errors

- [ ] Handle “no file selected” gracefully
- [ ] Show error toast when FFmpeg fails
- [ ] Reset UI after successful export

---

## Epic 6: Packaging and Distribution

### Story 6.1 – Build Configuration

- [ ] Add `electron-builder.yml`
- [ ] Configure app name, icon, and output directory
- [ ] Test builds on Linux first

### Story 6.2 – Cross-Platform Packaging (optional)

- [ ] Add macOS and Windows build configs
- [ ] Verify FFmpeg path handling on each platform

---

## Epic 7: Optional Enhancements (Post-MVP)

- [ ] Add waveform / timeline visualization
- [ ] Add drag-to-select trim range
- [ ] Allow audio muting or fade-in/out
- [ ] Enable multiple export presets (720p, 1080p, etc.)
- [ ] Integrate basic analytics (how long export took)

---

## Deliverables

- ✅ Working Electron app that can import, trim, and export video
- ✅ IPC communication with FFmpeg
- ✅ Functional UI with progress feedback
- ✅ Real FFmpeg integration with progress tracking
- ⏳ Bundled executable for Linux (and optionally macOS/Windows)

---

## Suggested File Order for Cursor to Work On

### ✅ Completed (Epic 1)

1. `electron/main.ts` ✅
2. `electron/preload.ts` ✅
3. `electron/electron-env.d.ts` ✅
4. `src/App.tsx` (basic test setup) ✅

### ✅ Completed (Epic 2)

5. `src/store/useVideoStore.ts` - Zustand state management ✅
6. `src/services/ipcClient.ts` - IPC service wrappers ✅
7. `src/components/VideoPlayer.tsx` - Video preview component ✅
8. `src/components/TrimControls.tsx` - Time selection controls ✅
9. `src/components/ExportDialog.tsx` - Export settings dialog ✅
10. `src/App.tsx` - Main app layout integration ✅

### ✅ Completed (Epic 3)

11. `electron/types.ts` - Shared TypeScript interfaces ✅
12. `electron/ffmpeg/runFFmpeg.ts` - FFmpeg utility with progress parsing ✅
13. `electron/ipcHandlers/clipVideo.ts` - Video trimming handler ✅
14. `electron/ipcHandlers/exportVideo.ts` - Export workflow handler ✅
15. `electron/main.ts` - Updated with real FFmpeg handlers ✅

### 🚧 Next Priority (Epic 4)

16. Enhanced UX and progress feedback
17. File validation improvements
18. Error handling refinements

### 🔄 Future (Epic 5-6)

19. App packaging and distribution
20. Cross-platform build configuration

---

## Notes for Cursor

- Use **IPC channels**: `video.import`, `video.clip`, `video.export`, `ffmpeg.progress`.
- Avoid direct Node calls in renderer; use preload bridge only.
- Use async/await everywhere for FFmpeg tasks.
- Keep UI simple: minimal layout, video preview, text inputs for time, and an export button.

---

**Target Output:**
A clean MVP Electron app that trims a video and exports it with FFmpeg — nothing more, nothing less.

```

```
