# Project Context - ClipForge Electron Prototype

## Project Overview

ClipForge is a lightweight desktop video editing application built with Electron. This is the prototype version focused on validating core functionality rather than providing full editing capabilities.

## Core Mission

Validate the basic flow of importing, trimming, and exporting videos using Electron + React + FFmpeg.

## MVP Features

1. **Import video** — open file picker and preview video
2. **Select trim range** — specify start and end times
3. **Export clip** — choose output folder, export at same or lower resolution
4. **Screen recording** — record screen with microphone audio
5. **Source selection** — choose screen/window to record
6. **Audio merging** — combine screen video with microphone audio

## Tech Stack

| Layer                | Technology                            | Purpose               |
| -------------------- | ------------------------------------- | --------------------- |
| **Frontend**         | React + TypeScript + Zustand          | UI and local state    |
| **Desktop Shell**    | Electron + Vite                       | Desktop environment   |
| **Video Processing** | FFmpeg via Node `child_process.spawn` | Trim/export videos    |
| **Styling**          | TailwindCSS + shadcn/ui               | Components            |
| **Packaging**        | Electron Builder                      | Cross-platform builds |
| **Package Manager**  | Bun                                   | Dependency management |

## Current Status

- ✅ Project initialized with Electron + Vite template
- ✅ TailwindCSS installed and ready for UI development
- ✅ Epic 1 Complete: Secure Electron shell with IPC bridge
- ✅ Epic 2 Complete: Frontend Interface (React + Zustand)
- ✅ Epic 3 Complete: Real FFmpeg integration with video processing
- ✅ Epic 4 Complete: UX/Progress & Packaging (Linux with bundled FFmpeg)
- ✅ Epic 7 Complete: UI Enhancements (doubled video player, tabbed settings)
- ✅ Epic 8 Complete: Data Structure Upgrade (two-track architecture)
- ✅ Epic 9 Complete: Screen Recording & Camera Overlay System
- ✅ Epic 10 Complete: Import Video Flow (Editor Core) with Welcome Screen
- ✅ Epic 11 Complete: Screen-Only Recording Flow with Microphone Integration
- ✅ Epic 12 Complete: Screen + Overlay Recording Flow with PiP Merging
- ✅ Context isolation enabled, node integration disabled
- ✅ Type-safe API interface available in renderer
- ✅ Development server running with hot reload
- 🚧 Ready for Epic 13: AI Auto-Muting (Filler-Word Removal)

## Key Constraints

- No complex editing features (timelines, projects, AI)
- Focus on simple trim and export workflow
- Must work with FFmpeg for video processing
- Screen recording with microphone audio only (system audio unreliable)
- Direct save workflow (no post-recording editor redirect)
