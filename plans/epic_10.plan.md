# Epic 10: Import Video Flow (Editor Core) - Completion Plan

## Goal

Complete Epic 10 by adding a Welcome Screen entry point and creating three separate, self-contained workflow components for each use case.

## Current State

- Video import, preview, timeline, trim controls, speed adjustments, and export are all working
- Recording system exists but is integrated into the main editor
- Need to separate concerns and create dedicated components for each workflow

## Implementation Tasks

### 1. Create Welcome Screen Component

**File**: `src/components/WelcomeScreen.tsx`

Create a new component that serves as the main entry point with three large, descriptive buttons:

- "Import Video" - Edit an existing clip (trim, speed, resolution)
- "Screen Recording" - Record your screen + mic
- "Screen + Overlay" - Record your screen and webcam together

Each button should navigate to its respective workflow component.

### 2. Create Import Video Editor Component

**File**: `src/components/ImportVideoEditor.tsx`

Extract the current editor functionality into a dedicated component for imported videos:

- Video import button
- Video player with controls
- Timeline with trim handles
- Settings panel (playback speed, export)
- Back to Welcome button

This is essentially the current `App.tsx` content but focused solely on imported video editing.

### 3. Create Screen Recording Component

**File**: `src/components/ScreenRecordingEditor.tsx`

Create a dedicated component for screen-only recording workflow:

- Source selection (screen/window picker)
- Microphone input selector
- Preview display
- Record/Stop controls
- After recording: auto-load into a simplified editor view
- Back to Welcome button

Duplicate necessary logic from `ScreenRecorder.tsx` and `RecordingControls.tsx` to keep it self-contained.

### 4. Create Screen + Overlay Component

**File**: `src/components/ScreenOverlayEditor.tsx`

Create a dedicated component for screen + camera recording workflow:

- Dual source selection (screen + camera)
- Live preview with PiP overlay
- Record/Stop controls
- After recording: show both tracks and export with PiP merge option
- Back to Welcome button

Duplicate necessary logic to keep it independent and straightforward.

### 5. Update App.tsx for Routing

**File**: `src/App.tsx`

Modify the main App component to:

- Add simple view state management (welcome, import, screen, overlay)
- Render WelcomeScreen by default
- Switch to appropriate editor component based on user selection
- Handle navigation between views

### 6. Update Store for Multi-Workflow Support

**File**: `src/store/useProjectStore.ts`

Add minimal state for tracking current workflow:

- `currentWorkflow: 'welcome' | 'import' | 'screen' | 'overlay' | null`
- `setWorkflow(workflow)` action
- Keep existing project state intact

### 7. Verify and Test

- Test import video workflow end-to-end
- Verify all existing features still work (timeline, trim, speed, export)
- Confirm navigation between Welcome Screen and editor works
- Document completion in memory-bank

## Key Design Principles

- Each workflow component is self-contained with its own logic
- Duplicate code is acceptable to maintain simplicity
- No complex routing library needed - simple state-based view switching
- Welcome Screen is always the starting point
- Each editor has a "Back to Welcome" button

## Files to Create

- `src/components/WelcomeScreen.tsx`
- `src/components/ImportVideoEditor.tsx`
- `src/components/ScreenRecordingEditor.tsx`
- `src/components/ScreenOverlayEditor.tsx`

## Files to Modify

- `src/App.tsx` - Add view state and routing logic
- `src/store/useProjectStore.ts` - Add workflow tracking

## Files to Reference (for duplication)

- Current `src/App.tsx` - Base for ImportVideoEditor
- `src/components/ScreenRecorder.tsx` - Logic for screen recording
- `src/components/RecordingControls.tsx` - Recording UI patterns
- `src/components/CameraRecorder.tsx` - Camera recording logic
