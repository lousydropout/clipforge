# Development Notes - ClipForge Electron Prototype

## Recent Changes

### 2025-01-29

- **Epic 11 Implementation**: Completed screen-only recording flow with microphone integration
- **Dual Recording Architecture**: Implemented separate screen video and microphone audio recording with FFmpeg merging
- **Microphone Device Selection**: Added `MicrophoneSelector` component with device enumeration and permission handling
- **Screen Source Selection**: Created `ScreenSourceSelector` component with `desktopCapturer` integration
- **Export Location Selection**: Added `ExportLocationSelector` component for user-chosen save locations
- **File Path Handling**: Fixed `file://` protocol prefix issues in file copying operations
- **Audio Merging**: Implemented FFmpeg-based audio/video merging with proper codec handling (libopus for WebM)
- **Preview System**: Restored and enhanced preview functionality with direct source selection
- **Workflow Simplification**: Removed post-recording video editor redirect, direct save to user location
- **IPC Enhancements**: Added new handlers for audio merging, file copying, and save dialog
- **System Audio Abandonment**: Pivoted from unreliable system audio capture to consistent microphone audio
- **UI/UX Improvements**: 
  - Replaced redundant source selection dialog with dropdown
  - Added export location requirement before recording
  - Fixed video player audio muting issues
  - Streamlined recording workflow

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
- ✅ Epic 11 Complete: Screen-Only Recording Flow with Microphone Integration
- ✅ Context isolation enabled, node integration disabled
- ✅ Type-safe API interface available in renderer
- ✅ Real video metadata extraction using FFprobe
- ✅ Real FFmpeg video processing with progress updates
- ✅ Two-track project structure with working recording system
- ✅ Screen recording with microphone audio capture and merging
- ✅ Camera recording with microphone audio processing
- ✅ Source selection dialog for screen/window capture
- ✅ Live preview system for recording sources
- ✅ WebM recording with optimized export workflow
- ✅ Welcome Screen with three workflow options (Import, Screen, Screen+Overlay)
- ✅ Separate editor components for each workflow
- ✅ Microphone device selection and permission handling
- ✅ Export location selection with native file dialog
- ✅ Dual recording architecture with FFmpeg audio merging
- ✅ Development server running with hot reload
- 🚧 Ready for Epic 12: Screen + Overlay Recording Flow

## MVP Checklist

- [x] Import and preview video
- [x] Input start/end timestamps
- [x] Run FFmpeg trim via IPC (real FFmpeg implementation complete)
- [x] Export to chosen folder (real FFmpeg implementation complete)
- [x] Display export progress in UI
- [x] Screen recording with microphone audio
- [x] Camera recording with microphone audio
- [x] Live preview of recording sources
- [x] Source selection for screen/window capture
- [x] Microphone device selection and permission handling
- [x] Export location selection for recorded videos
- [x] Audio/video merging with FFmpeg
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

### Epic 11: Screen-Only Recording Flow ✅ COMPLETED

**Goal**: Let users record screen with microphone, save locally, auto-open in editor.

**Current Status**: Complete with dual recording architecture and FFmpeg merging

**Epic 11 Completion Summary**:
- **Dual Recording System**: Implemented separate screen video and microphone audio recording
- **MicrophoneSelector Component**: Added device enumeration with permission handling
- **ScreenSourceSelector Component**: Created dropdown for screen/window source selection
- **ExportLocationSelector Component**: Added native file dialog for save location selection
- **FFmpeg Audio Merging**: Implemented proper audio/video merging with libopus codec
- **Preview System**: Restored and enhanced preview with direct source selection
- **Workflow Simplification**: Removed post-recording editor redirect, direct save to user location
- **File Path Handling**: Fixed `file://` protocol prefix issues in file operations
- **UI/UX Improvements**: Streamlined recording workflow with better user experience
- **System Audio Pivot**: Abandoned unreliable system audio for consistent microphone audio

**Tasks**:
- [x] Simplify current screen recording system
- [x] Implement source selection via `desktopCapturer.getSources()`
- [x] Add mic input selector from `enumerateDevices()`
- [x] Use `getUserMedia` for video + `getUserMedia` for mic (dual approach)
- [x] Record tracks separately and merge with FFmpeg
- [x] Add export location selection requirement
- [x] Implement direct save to user-chosen location
- [x] Handle audio track merging with proper error handling

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

### Epic 11 Implementation Challenges (2025-01-29)

**System Audio Capture Issues**:
- **Problem**: `getDisplayMedia` with system audio was unreliable across platforms
- **Solution**: Pivoted to microphone-only audio capture with dual recording architecture
- **Result**: Consistent audio capture with better user experience

**Microphone Permission Handling**:
- **Problem**: `DOMException: Could not start audio source` when enumerating devices
- **Solution**: Implemented graceful permission request with temporary stream creation
- **Result**: Smooth device enumeration with proper permission handling

**FFmpeg Audio Merging**:
- **Problem**: Multiple codec and stream mapping issues during audio/video merging
- **Challenges**: 
  - Stream specifier errors with `amix` filter
  - AAC codec incompatibility with WebM container
  - Experimental Opus encoder warnings
- **Solution**: 
  - Used explicit stream mapping (`-map 0:v:0 -map 1:a:0`)
  - Switched to `libopus` codec for WebM compatibility
  - Removed `amix` filter in favor of direct mapping
- **Result**: Reliable audio/video merging with proper codec handling

**File Path Protocol Issues**:
- **Problem**: `file://` protocol prefix causing `ENOENT` errors in file operations
- **Solution**: Added path cleaning in main process IPC handlers
- **Result**: Proper file copying to user-chosen locations

**UI/UX Improvements**:
- **Problem**: Redundant source selection dialogs and poor workflow
- **Solution**: 
  - Replaced dialog with dropdown source selection
  - Added export location requirement before recording
  - Removed post-recording editor redirect
- **Result**: Streamlined recording workflow with better user experience

## Recording System Architecture

### Audio Sources
- **Screen Recording**: Microphone audio with processing (echo cancellation, noise suppression, auto gain)
- **Camera Recording**: Microphone audio with processing (echo cancellation, noise suppression, auto gain)

### Stream Capture Strategy
- **Screen Video**: `getUserMedia` with `chromeMediaSource: "desktop"` + specific `sourceId`
- **Screen Audio**: Attempted via `getDisplayMedia` but unreliable, abandoned for microphone audio
- **Microphone Audio**: `getUserMedia` with specific device ID and audio processing
- **Dual Recording**: Separate MediaRecorder instances for video and audio, merged with FFmpeg

### File Format Workflow
- **Recording**: WebM files (faster, more responsive)
- **Merging**: FFmpeg combines screen video and microphone audio into single WebM
- **Export**: Direct save to user-chosen location (no MP4 conversion)
- **Storage**: `/tmp/clipforge-recordings/` for temporary files, user location for final output

### UI Components
- **ScreenSourceSelector**: Dropdown for choosing screen/window source
- **MicrophoneSelector**: Device selection with permission handling
- **ExportLocationSelector**: Native file dialog for save location
- **RecordButton**: Start/stop recording button
- **PreviewService**: Centralized stream management for live previews
- **VideoPlayerWithControls**: Displays both recorded videos and live previews

## Overall App Flow (Planned)

```
Welcome Screen
 ├── Import Video  →  Epic 10 (Editor Core)
 ├── Screen Only   →  Epic 11  →  Direct Save to User Location
 └── Screen+Overlay→  Epic 12  →  Editor (Epic 10)
                               ↘ (optional) Epic 13 (AI Muting)
```

## Current System vs. Planned Epics Alignment

### What's Already Built ✅
- **Epic 10 (Editor Core)**: 100% complete - has video import, preview, timeline, trim controls, speed/resolution adjustments, export
- **Epic 11 (Screen Recording)**: 100% complete - has dual recording system with microphone audio and FFmpeg merging
- **Epic 12 (Screen + Overlay)**: 60% complete - has two-track system, but needs PiP merging instead

### What Needs to be Added/Modified 🔄
- **Epic 12 PiP Merging**: Current two-track approach needs to change to PiP merging
- **Epic 13 AI Muting**: Completely new feature

### Key Architectural Changes Needed
1. **PiP Processing**: Replace two-track recording with FFmpeg PiP merging for Epic 12
2. **AI Integration**: Add Whisper + GPT pipeline for Epic 13

## Development Environment

- OS: Linux 6.16.3-76061603-generic
- Package Manager: Bun
- Node Version: ≥ 20 (required)
- FFmpeg: Must be installed and in PATH
