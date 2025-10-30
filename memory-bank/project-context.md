# Project Context - ClipForge Electron Prototype

## Project Overview

ClipForge is a lightweight desktop video editing application built with Electron. This is the prototype version focused on validating core functionality rather than providing full editing capabilities.

## Core Mission

Originally: Validate the basic flow of importing, trimming, and exporting videos using Electron + React + FFmpeg.

**Updated Goal**: An AI-powered video editing app that suggests engaging short clips from your videos for social media content creation.

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
- ✅ Epic 13 Complete: AI Auto-Muting (Filler-Word Removal) - **CATASTROPHICALLY BROKEN**
- ✅ Epic 14 Complete: AI Short Suggestion Pipeline + Resolution Scaling
- ✅ Context isolation enabled, node integration disabled
- ✅ Type-safe API interface available in renderer
- ✅ Development server running with hot reload
- ✅ **AI Short Suggestions**: Interactive AI-powered short clip discovery with video seeking
- ✅ **Resolution Scaling**: 25%-100% export resolution scaling for optimized file sizes

## Key Constraints

- No complex editing features (timelines, projects, AI) - **AI feature successfully implemented**
- Focus on simple trim and export workflow
- Must work with FFmpeg for video processing
- Screen recording with microphone audio only (system audio unreliable)
- Direct save workflow (no post-recording editor redirect)
- **NEW**: Requires OPENAI_API_KEY environment variable for AI short suggestions

## ✅ AI Feature Success

### AI Short Suggestion Pipeline
The AI feature was successfully pivoted from broken filler word removal to a valuable short suggestion system:

**What It Does**: Analyzes video transcripts to identify engaging, self-contained sentences that would work well as short clips for social media.

**How It Works**:
1. **Extract Audio** - FFmpeg extracts audio from video
2. **Whisper Transcription** - OpenAI Whisper generates word-level transcript with timestamps
3. **Segment Transcript** - Groups words into sentences based on punctuation and pauses
4. **AI Short Suggestions** - GPT-4.1-mini identifies "short-worthy" sentences with scores and reasons

**User Experience**:
- Click suggestions to seek video and auto-play the segment
- Color-coded scores (Green 75%+, Yellow 50-74%, Gray <50%)
- Hover tooltips show AI reasoning
- Auto-updates trim range with 0.5s buffer
- Audio preview player for reviewing extracted audio

**Technical Success**:
- Proper proportional scaling (both width and height scale together)
- Batch processing for long videos (30 sentences per chunk)
- Robust error handling with JSON parsing
- Seamless video integration with seeking and auto-play
