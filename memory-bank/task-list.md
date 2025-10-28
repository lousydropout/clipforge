# ClipForge Electron Prototype – Task Plan

## Goal

Build a lightweight Electron app that can:

- Import a local video
- Trim it via start/end timestamps
- Export it at the same or lower resolution using FFmpeg

No project system, no AI features — just a clean, working pipeline.

## Current Status

- ✅ **Epic 1 Complete**: Electron shell with secure IPC bridge
- 🚧 **Epic 2 Next**: Frontend Interface (React + Zustand)
- ⏳ **Epic 3-4 Pending**: IPC Handlers & FFmpeg Integration
- ⏳ **Epic 5-6 Pending**: UX/Progress & Packaging

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

## Epic 2: Frontend Interface (React + Zustand) 🚧 NEXT

### Story 2.1 – UI Scaffolding

- [ ] Create base layout in `App.tsx`
- [ ] Add TailwindCSS and shadcn/ui setup
- [ ] Implement `<VideoPlayer />` for preview using native `<video>` tag
- [ ] Implement `<TrimControls />` for start/end inputs
- [ ] Implement `<ExportDialog />` for save path + scale choice

### Story 2.2 – State Management

- [ ] Create Zustand store `useVideoStore.ts`:

  ```ts
  interface VideoState {
    filePath: string | null;
    start: number;
    end: number;
    scale: number | null;
  }
  ```

- [ ] Actions: `setFilePath`, `setStart`, `setEnd`, `setScale`, `reset()`

### Story 2.3 – User Flow Integration

- [ ] Import → preview video path
- [ ] Adjust start/end → show markers
- [ ] Export → trigger IPC handler → display progress

---

## Epic 3: IPC Handlers (Node / Electron Main Process)

### Story 3.1 – Import Video

- [ ] Create `ipcHandlers/importVideo.ts`

  - Use `dialog.showOpenDialog`
  - Return selected video path

- [ ] Test via renderer call `window.api.invoke('video.import')`

### Story 3.2 – Clip Video (FFmpeg)

- [ ] Create `ipcHandlers/clipVideo.ts`

  - Accept `{ inputPath, start, end, outputPath, scale }`
  - Call `runFFmpeg.ts`

- [ ] Implement progress streaming via `stderr`
- [ ] Send `ffmpeg.progress` IPC events back to renderer

### Story 3.3 – Export Video

- [ ] Create `ipcHandlers/exportVideo.ts`

  - Allow user to select destination folder
  - Save trimmed clip there
  - Notify frontend when done

---

## Epic 4: FFmpeg Integration

### Story 4.1 – FFmpeg Utility

- [ ] Create `electron/ffmpeg/runFFmpeg.ts`

  - Use `child_process.spawn`
  - Log stderr lines for progress
  - Resolve/reject Promise on close

- [ ] Handle errors gracefully and report to renderer

### Story 4.2 – FFmpeg Commands

- [ ] Base trim command:

  ```bash
  ffmpeg -ss {start} -to {end} -i {inputPath} -c copy {outputPath}
  ```

- [ ] With scaling:

  ```bash
  ffmpeg -ss {start} -to {end} -i {inputPath} -vf "scale=-1:{scale}" -c:a copy {outputPath}
  ```

- [ ] Test edge cases (invalid timestamps, unsupported formats)

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
- ✅ Bundled executable for Linux (and optionally macOS/Windows)

---

## Suggested File Order for Cursor to Work On

### ✅ Completed (Epic 1)

1. `electron/main.ts` ✅
2. `electron/preload.ts` ✅
3. `electron/electron-env.d.ts` ✅
4. `src/App.tsx` (basic test setup) ✅

### 🚧 Next Priority (Epic 2)

5. `src/store/useVideoStore.ts` - Zustand state management
6. `src/services/ipcClient.ts` - IPC service wrappers
7. `src/components/VideoPlayer.tsx` - Video preview component
8. `src/components/TrimControls.tsx` - Time selection controls
9. `src/components/ExportDialog.tsx` - Export settings dialog
10. `src/App.tsx` - Main app layout integration

### 🔄 Future (Epic 3-4)

11. `electron/ipcHandlers/importVideo.ts` - File dialog handler
12. `electron/ipcHandlers/clipVideo.ts` - FFmpeg trim handler
13. `electron/ffmpeg/runFFmpeg.ts` - FFmpeg utility
14. `electron/ipcHandlers/exportVideo.ts` - Export handler

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
