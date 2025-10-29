# Development Notes - ClipForge Electron Prototype

## Recent Changes

### 2025-01-29

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
- ✅ Development server running with hot reload
- 🚧 Ready for Epic 10: Advanced Recording Features & Polish

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

## Next Development Steps

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

## Development Environment

- OS: Linux 6.16.3-76061603-generic
- Package Manager: Bun
- Node Version: ≥ 20 (required)
- FFmpeg: Must be installed and in PATH
