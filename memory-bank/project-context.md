# Project Context - ClipForge Electron Prototype

## Project Overview

ClipForge is a lightweight desktop video editing application built with Electron. This is the prototype version focused on validating core functionality rather than providing full editing capabilities.

## Core Mission

Validate the basic flow of importing, trimming, and exporting videos using Electron + React + FFmpeg.

## MVP Features

1. **Import video** — open file picker and preview video
2. **Select trim range** — specify start and end times
3. **Export clip** — choose output folder, export at same or lower resolution

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
- ✅ Context isolation enabled, node integration disabled
- ✅ Type-safe API interface available in renderer
- ✅ Development server running with hot reload
- 🚧 Ready for Epic 2: Frontend Interface (React + Zustand)

## Key Constraints

- No complex editing features (timelines, projects, AI)
- Focus on simple trim and export workflow
- Must work with FFmpeg for video processing
