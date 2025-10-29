# Epic 6: Data Structure Upgrade - Two-Track Foundation

## Overview

Transform the single-video trimmer into a two-track architecture by migrating `useVideoStore` to `useProjectStore` with support for main and overlay tracks. This foundational change enables future screen recording, camera overlay, and AI muting features.

## Core Changes

### 1. Store Migration

**File:** `src/store/useVideoStore.ts` → `src/store/useProjectStore.ts`

Create new interfaces:

- `VideoTrack`: Represents a single track with id, source type, path, metadata, trim times, and optional AI-processed path
- `Project`: Contains mainTrack and optional overlayTrack

Replace flat video state with nested project structure while maintaining processing and timeline state at store level.

### 2. Component Updates

Update all 11 components that use `useVideoStore`:

**Core components:**

- `App.tsx`: Update imports and video path checks to use `project?.mainTrack?.path`
- `VideoPlayer.tsx`: Access video data from `project?.mainTrack`
- `ExportDialog.tsx`: Read trim settings from mainTrack
- `TrimControls.tsx`: Update mainTrack trim times
- `ResolutionControls.tsx`: Access mainTrack metadata

**Timeline components:**

- `Timeline.tsx`: Read mainTrack metadata
- `VideoTrack.tsx`: Update mainTrack trim times
- `Playhead.tsx`: No changes needed (uses timeline state only)
- `TimelineControls.tsx`: Update mainTrack trim times

**Service layer:**

- `ipcClient.ts`: Update VideoMetadata import path

### 3. Backward Compatibility

When importing a video, create a new project with:

- mainTrack populated with video data
- overlayTrack set to undefined
- Existing trim/export workflow continues to work

## Implementation Strategy

1. Create new `useProjectStore.ts` with two-track structure
2. Update all component imports from `useVideoStore` to `useProjectStore`
3. Replace direct state access with project-aware selectors
4. Update state setters to use `updateTrack("main", ...)` pattern
5. Test existing workflow (import → trim → export) still works

## Testing Checklist

- Import video creates project with mainTrack populated
- Video player displays mainTrack video correctly
- Trim controls update mainTrack start/end times
- Export uses mainTrack data and ignores overlayTrack
- Console logging shows two-track structure
- All existing keyboard shortcuts work
- Timeline visualization works correctly
