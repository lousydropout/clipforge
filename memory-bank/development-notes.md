# Development Notes - ClipForge Electron Prototype

## Recent Changes

### 2025-01-29

- **Epic 10 Completion**: Implemented Welcome Screen with three separate workflow components (Import Video, Screen Recording, Screen + Overlay)
- **Timeline UI Enhancement**: Updated VideoTrack component to show full video "tape" at low opacity with selected portion highlighted
- **File Path Export Fix**: Fixed critical "Input video file not found" error by properly converting file:// URLs to file system paths
- **Recording System Overhaul**: Replaced custom MediaRecorder implementation with `react-media-recorder` library
- **Screen Recording Audio Fix**: Implemented separate video/audio stream capture and merging for system audio
- **Source Selection Dialog**: Added Electron `desktopCapturer` integration for screen/window source selection
- **UI Separation**: Split recording controls into `SourceSelector` and `RecordButton` components
- **Preview Service**: Created centralized `previewService` for managing live stream previews
- **WebM Optimization**: Skip MP4 conversion during recording, only convert during export
- **Infinite Loop Fix**: Fixed camera recording infinite loop bug with proper blob processing
- **Audio Source Configuration**: 
  - Screen recording: System audio (speakers, applications)
  - Camera recording: Microphone audio with processing (echo cancellation, noise suppression)

### 2025-01-27

- **TailwindCSS Setup**: Added `tailwindcss@4.1.16` and `@tailwindcss/vite@4.1.16` to project
- **Memory Bank Initialization**: Created memory-bank directory structure for project documentation
- **README Update**: Enhanced README with detailed tech stack, folder structure, and concrete code examples
- **Epic 1 Complete**: Electron Shell Setup with secure IPC bridge and context isolation
- **Epic 2 Complete**: Frontend Interface with React + Zustand + shadcn/ui
- **Epic 3 Complete**: IPC Handlers & FFmpeg Integration with real video processing
- **Real Video Metadata**: Integrated FFprobe for actual video metadata extraction
- **Real FFmpeg Integration**: Replaced all mock handlers with production FFmpeg processing
- **Epic 8 Complete**: Data Structure Upgrade - Two-track architecture foundation
- **Store Migration**: Migrated from single-video to project-based two-track system
- **Duration Fix**: Fixed timeline/video player duration mismatch issue

## Current Status

- ✅ Project initialized with Electron + Vite template
- ✅ TailwindCSS installed and ready for UI development
- ✅ Epic 1 Complete: Secure Electron shell with IPC bridge
- ✅ Epic 2 Complete: Complete React frontend with video player, trim controls, and export dialog
- ✅ Epic 3 Complete: Real FFmpeg integration with video processing and progress tracking
- ✅ Epic 4 Complete: UX/Progress & Packaging (Linux with bundled FFmpeg)
- ✅ Epic 7 Complete: UI Enhancements (doubled video player, tabbed settings)
- ✅ Epic 8 Complete: Data Structure Upgrade (two-track architecture foundation)
- ✅ Epic 9 Complete: Screen Recording & Camera Overlay System
- ✅ Epic 10 Complete: Import Video Flow (Editor Core) with Welcome Screen
- ✅ Context isolation enabled, node integration disabled
- ✅ Type-safe API interface available in renderer
- ✅ Real video metadata extraction using FFprobe
- ✅ Real FFmpeg video processing with progress updates
- ✅ Two-track project structure with working recording system
- ✅ Screen recording with system audio capture
- ✅ Camera recording with microphone audio processing
- ✅ Source selection dialog for screen/window capture
- ✅ Live preview system for recording sources
- ✅ WebM recording with optimized export workflow
- ✅ Welcome Screen with three workflow options (Import, Screen, Screen+Overlay)
- ✅ Separate editor components for each workflow
- ✅ Development server running with hot reload
- 🚧 Ready for Epic 11: Screen-Only Recording Flow

## MVP Checklist

- [x] Import and preview video
- [x] Input start/end timestamps
- [x] Run FFmpeg trim via IPC (real FFmpeg implementation complete)
- [x] Export to chosen folder (real FFmpeg implementation complete)
- [x] Display export progress in UI
- [x] Screen recording with system audio
- [x] Camera recording with microphone audio
- [x] Live preview of recording sources
- [x] Source selection for screen/window capture
- [x] Two-track recording system (main + overlay)

## Upcoming Epic Plans

### Epic 10: Import Video Flow (Editor Core) ✅ COMPLETED

**Goal**: Implement the base editing workspace that all recordings feed into.

**Current Status**: Complete with Welcome Screen entry point and three separate workflow components

**Tasks**:
- [x] Add Welcome Screen as entry point
- [x] Simplify current editor for single-track editing
- [x] Ensure import & metadata extraction works
- [x] Verify video preview with play/pause/scrub
- [x] Confirm timeline editor with trim handles
- [x] Test adjustments panel (speed, resolution)
- [x] Validate export workflow

**Epic 10 Completion Summary**:
- **Welcome Screen**: Created main entry point with three workflow options (Import Video, Screen Recording, Screen + Overlay)
- **Import Video Editor**: Dedicated component for editing imported videos with full timeline and export functionality
- **Screen Recording Editor**: Self-contained screen recording workflow with preview and post-recording editing
- **Screen + Overlay Editor**: Dual recording workflow for screen + camera with PiP preparation
- **Timeline UI Enhancement**: Updated VideoTrack to show full video "tape" at low opacity with selected portion highlighted
- **File Path Export Fix**: Resolved critical export error by properly converting file:// URLs to file system paths
- **Workflow Management**: Added `currentWorkflow` state to store for navigation between components
- **Component Architecture**: Each workflow is self-contained with duplicated logic for simplicity
- **Navigation**: Simple state-based routing with "Back to Welcome" buttons
- **Build Status**: All components compile successfully with no TypeScript errors

### Epic 11: Screen-Only Recording Flow 📋 PLANNED

**Goal**: Let users record screen with microphone, save locally, auto-open in editor.

**Tasks**:
- [ ] Simplify current screen recording system
- [ ] Implement source selection via `desktopCapturer.getSources()`
- [ ] Add mic input selector from `enumerateDevices()`
- [ ] Use `getDisplayMedia` for video + `getUserMedia` for mic
- [ ] Combine tracks into single `MediaStream`
- [ ] Add post-recording processing overlay
- [ ] Implement auto-redirect to editor
- [ ] Handle audio track missing warnings

### Epic 12: Screen + Overlay Recording Flow 📋 PLANNED

**Goal**: Record screen and webcam simultaneously, create PiP video, import to editor.

**Tasks**:
- [ ] Implement dual source setup (screen + camera)
- [ ] Add live preview with webcam thumbnail overlay
- [ ] Create dual recording logic (separate `MediaRecorder` streams)
- [ ] Implement FFmpeg PiP merging post-processing
- [ ] Add PiP size/position controls
- [ ] Auto-redirect merged clip to editor

### Epic 13: AI Auto-Muting (Filler-Word Removal) 📋 PLANNED

**Goal**: Optional AI processing to identify and mute filler words using Whisper + GPT.

**Tasks**:
- [ ] Implement audio extraction via FFmpeg
- [ ] Add Whisper API integration for transcription
- [ ] Create GPT-4.1-mini integration for filler detection
- [ ] Implement FFmpeg mute processing
- [ ] Add "Auto-mute filler words" toggle in editor
- [ ] Integrate AI pipeline with export workflow

## Completed Development Phases

### Phase 1: Core Infrastructure ✅ COMPLETED

- [x] Configure TailwindCSS in Vite config
- [x] Set up shadcn/ui components
- [x] Create basic app layout and navigation
- [x] Implement Zustand store structure

### Phase 2: Video Import & Preview ✅ COMPLETED

- [x] Create file import dialog (IPC handler)
- [x] Implement video preview component
- [x] Add video metadata extraction (duration, resolution)
- [x] Handle different video formats

### Phase 3: Trim Controls ✅ COMPLETED

- [x] Build time range slider component
- [x] Add start/end time input fields
- [x] Implement visual timeline scrubber
- [x] Add keyboard shortcuts for precision

### Phase 4: Export Functionality ✅ COMPLETED

- [x] Create export settings dialog
- [x] Implement FFmpeg command generation (real implementation)
- [x] Add progress tracking and UI updates
- [x] Handle export success/error states

### Phase 5: Real FFmpeg Integration (Epic 3) ✅ COMPLETED

- [x] Replace mock IPC handlers with real FFmpeg integration
- [x] Implement actual video trimming with FFmpeg
- [x] Add real file export functionality
- [x] Handle FFmpeg progress parsing and streaming

### Phase 6: Recording System (Epic 9) ✅ COMPLETED

- [x] Implement screen recording with `react-media-recorder`
- [x] Add camera recording with microphone audio processing
- [x] Create source selection dialog using Electron `desktopCapturer`
- [x] Implement live preview system for recording sources
- [x] Fix screen recording audio with separate video/audio stream capture
- [x] Optimize recording workflow (WebM during recording, MP4 on export)
- [x] Fix camera recording infinite loop bug
- [x] Separate UI components for source selection and recording controls

## Technical Decisions

### Why FFmpeg CLI over WASM?

- Better performance for video processing
- More reliable for production use
- Easier to debug and maintain
- Native system integration

### Why react-media-recorder over custom MediaRecorder?

- Handles MediaRecorder API complexity and timing issues
- Provides reliable blob finalization
- Reduces custom code maintenance
- Better error handling and state management

### Why separate video/audio streams for screen recording?

- `getUserMedia` with `chromeMediaSource: "desktop"` doesn't capture system audio
- `getDisplayMedia` provides system audio but limited source selection
- Combining streams gives both specific source selection AND system audio
- More reliable audio capture across different platforms

### Why WebM during recording, MP4 on export?

- WebM is faster to record and process
- Reduces recording latency and improves responsiveness
- MP4 conversion only happens when user actually exports
- Better user experience with instant recording start/stop

## Known Issues

- None currently identified

## Bug Fixes

### File Path Export Issue (2025-01-29)

**Problem**: "Input video file not found" error during export, even when video file exists.

**Root Cause**: File URL conversion was removing the leading slash from file paths:
- Video import stores paths as `file:///path/to/video.mp4` URLs (for security)
- Export handler was converting to `path/to/video.mp4` (missing leading slash)
- `statSync()` and FFmpeg couldn't find the file

**Solution**: Updated `fileUrlToPath()` function in `electron/ipcHandlers/exportVideo.ts`:
```typescript
function fileUrlToPath(fileUrl: string): string {
  if (fileUrl.startsWith('file://')) {
    const path = fileUrl.replace(/^file:\/\/+/, '');
    return path.startsWith('/') ? path : '/' + path;
  }
  return fileUrl;
}
```

**Result**: 
- ✅ Proper path conversion: `file:///path/to/video.mp4` → `/path/to/video.mp4`
- ✅ File existence checks work correctly
- ✅ FFmpeg receives valid file paths
- ✅ Export functionality restored

## Recording System Architecture

### Audio Sources
- **Screen Recording**: System audio (speakers, applications, games)
- **Camera Recording**: Microphone audio with processing (echo cancellation, noise suppression, auto gain)

### Stream Capture Strategy
- **Screen Video**: `getUserMedia` with `chromeMediaSource: "desktop"` + specific `sourceId`
- **Screen Audio**: `getDisplayMedia` with `audio: true` for system audio
- **Combined**: Merged MediaStream with video tracks from desktopCapturer + audio tracks from getDisplayMedia

### File Format Workflow
- **Recording**: WebM files (faster, more responsive)
- **Export**: MP4 conversion only when user exports final video
- **Storage**: `/tmp/clipforge-recordings/` with `file://` URLs for renderer access

### UI Components
- **SourceSelector**: Dropdown for choosing recording source (Screen/Camera/None)
- **RecordButton**: Start/stop recording button
- **PreviewService**: Centralized stream management for live previews
- **VideoPlayerWithControls**: Displays both recorded videos and live previews

## Overall App Flow (Planned)

```
Welcome Screen
 ├── Import Video  →  Epic 10 (Editor Core)
 ├── Screen Only   →  Epic 11  →  Editor (Epic 10)
 └── Screen+Overlay→  Epic 12  →  Editor (Epic 10)
                               ↘ (optional) Epic 13 (AI Muting)
```

## Current System vs. Planned Epics Alignment

### What's Already Built ✅
- **Epic 10 (Editor Core)**: 90% complete - has video import, preview, timeline, trim controls, speed/resolution adjustments, export
- **Epic 11 (Screen Recording)**: 80% complete - has screen recording with audio, but needs simplification
- **Epic 12 (Screen + Overlay)**: 60% complete - has two-track system, but needs PiP merging instead

### What Needs to be Added/Modified 🔄
- **Welcome Screen**: New entry point needed
- **Epic 11 Simplification**: Current system is more complex than needed
- **Epic 12 PiP Merging**: Current two-track approach needs to change to PiP merging
- **Epic 13 AI Muting**: Completely new feature

### Key Architectural Changes Needed
1. **Welcome Screen**: Add as main entry point before current editor
2. **Single-Track Editor**: Simplify current two-track system for Epic 10
3. **PiP Processing**: Replace two-track recording with FFmpeg PiP merging for Epic 12
4. **AI Integration**: Add Whisper + GPT pipeline for Epic 13

## Development Environment

- OS: Linux 6.16.3-76061603-generic
- Package Manager: Bun
- Node Version: ≥ 20 (required)
- FFmpeg: Must be installed and in PATH
