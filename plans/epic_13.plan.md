# Epic 13: AI Auto-Muting (Filler-Word Removal)

## Overview

Add AI-powered filler word detection and muting with a new component below the timeline. The component shows 4 processing steps: extract audio, Whisper transcription, GPT filler detection, and FFmpeg muting. All API calls happen in main process using `process.env.OPENAI_API_KEY`.

## Current State

- Timeline component exists in `src/components/timeline/Timeline.tsx`
- FFmpeg integration exists for video processing
- IPC handlers available for file operations
- OpenAI SDK will be added as dependency

## Implementation Plan

### 1. Install OpenAI SDK

**File: `package.json`**

Add OpenAI SDK dependency:

```bash
bun add openai
```

### 2. Create AI IPC Handlers

**File: `electron/ipcHandlers/aiHandlers.ts` (NEW)**

Create handlers using OpenAI SDK with proper data handling:

```typescript
import OpenAI from "openai";
import { spawn } from "child_process";
import { createReadStream } from "fs";
import { writeFile, unlink } from "fs/promises";
import { join } from "path";
import { app } from "electron";

// Initialize OpenAI client with API key from environment
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface WhisperWord {
  start: number;
  end: number;
  text: string;
}

interface WhisperResponse {
  text: string;
  words: WhisperWord[];
}

interface FillerInterval {
  start: number;
  end: number;
  text: string;
}

// Step 1: Extract audio to 16kHz mono WAV
export async function handleExtractAudio(params: {
  videoPath: string;
}): Promise<string> {
  const tempDir = app.getPath("temp");
  const outputPath = join(tempDir, `audio_${Date.now()}.wav`);

  return new Promise((resolve, reject) => {
    const ffmpeg = spawn("ffmpeg", [
      "-y", // Overwrite output
      "-i",
      params.videoPath, // Input video
      "-vn", // No video
      "-ar",
      "16000", // 16kHz sample rate
      "-ac",
      "1", // Mono
      "-c:a",
      "pcm_s16le", // PCM 16-bit encoding
      outputPath,
    ]);

    let errorOutput = "";
    ffmpeg.stderr.on("data", (data) => {
      errorOutput += data.toString();
    });

    ffmpeg.on("close", (code) => {
      if (code === 0) {
        resolve(outputPath);
      } else {
        reject(new Error(`Audio extraction failed: ${errorOutput}`));
      }
    });

    ffmpeg.on("error", (error) => {
      reject(new Error(`FFmpeg process error: ${error.message}`));
    });
  });
}

// Step 2: Whisper transcription with word-level timestamps
export async function handleWhisperTranscription(params: {
  audioPath: string;
}): Promise<WhisperResponse> {
  const transcription = await openai.audio.transcriptions.create({
    file: createReadStream(params.audioPath),
    model: "whisper-1",
    response_format: "verbose_json",
    timestamp_granularities: ["word"],
  });

  // Flatten segments[].words[] into single array
  const words: WhisperWord[] = [];
  if (transcription.words) {
    for (const word of transcription.words) {
      words.push({
        start: word.start,
        end: word.end,
        text: word.word,
      });
    }
  }

  return {
    text: transcription.text,
    words: words,
  };
}

// Step 3: GPT filler detection with optimized prompt
export async function handleGPTFillerDetection(params: {
  words: WhisperWord[];
}): Promise<FillerInterval[]> {
  // Send only essential data to GPT
  const wordsForGPT = params.words.map((w) => ({
    start: w.start,
    end: w.end,
    text: w.text,
  }));

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          "You identify filler words in transcripts. Return a JSON object with an 'intervals' array containing objects with start, end, and text fields.",
      },
      {
        role: "user",
        content: `Identify filler words in this transcript. Return JSON: {"intervals": [{"start": 1.2, "end": 1.5, "text": "uh"}]}

Words: ${JSON.stringify(wordsForGPT)}

Filler words to detect: "uh", "um", "like", "you know", "so", "well", "actually", "basically", "literally"`,
      },
    ],
    response_format: { type: "json_object" },
  });

  const result = JSON.parse(
    response.choices[0].message.content || '{"intervals":[]}'
  );
  return result.intervals || [];
}

// Step 4: Apply muting with correct FFmpeg filter syntax
export async function handleApplyMuting(params: {
  videoPath: string;
  fillerIntervals: FillerInterval[];
}): Promise<string> {
  const tempDir = app.getPath("temp");
  const outputPath = join(tempDir, `muted_${Date.now()}.mp4`);

  // Build volume filter string with comma-separated filters
  const volumeFilters = params.fillerIntervals
    .map(
      (interval) =>
        `volume=enable='between(t,${interval.start},${interval.end})':volume=0`
    )
    .join(",");

  return new Promise((resolve, reject) => {
    const ffmpeg = spawn("ffmpeg", [
      "-y",
      "-i",
      params.videoPath,
      "-af",
      volumeFilters,
      "-c:v",
      "copy", // Copy video without re-encoding
      outputPath,
    ]);

    let errorOutput = "";
    ffmpeg.stderr.on("data", (data) => {
      errorOutput += data.toString();
    });

    ffmpeg.on("close", (code) => {
      if (code === 0) {
        resolve(outputPath);
      } else {
        reject(new Error(`Muting failed: ${errorOutput}`));
      }
    });

    ffmpeg.on("error", (error) => {
      reject(new Error(`FFmpeg process error: ${error.message}`));
    });
  });
}

// Cleanup temporary files
export async function handleCleanupTempFiles(params: {
  filePaths: string[];
}): Promise<void> {
  for (const filePath of params.filePaths) {
    try {
      await unlink(filePath);
    } catch (error) {
      console.warn(`Failed to delete temp file ${filePath}:`, error);
    }
  }
}
```

### 3. Create AI Processor Component

**File: `src/components/AIProcessor.tsx` (NEW)**

Create UI component with 4-step progress:

```typescript
import { useState } from "react";
import { Button } from "./ui/button";
import { toast } from "sonner";
import { ipcClient } from "../services/ipcClient";
import { CheckCircle2, Circle, Loader2, XCircle } from "lucide-react";

interface FillerInterval {
  start: number;
  end: number;
  text: string;
}

interface AIProcessorProps {
  videoPath: string;
  onProcessingComplete: (mutedVideoPath: string) => void;
}

type StepStatus = "pending" | "processing" | "complete" | "error";

export function AIProcessor({
  videoPath,
  onProcessingComplete,
}: AIProcessorProps) {
  const [step1Status, setStep1Status] = useState<StepStatus>("pending");
  const [step2Status, setStep2Status] = useState<StepStatus>("pending");
  const [step3Status, setStep3Status] = useState<StepStatus>("pending");
  const [step4Status, setStep4Status] = useState<StepStatus>("pending");

  const [audioPath, setAudioPath] = useState<string | null>(null);
  const [fillerIntervals, setFillerIntervals] = useState<FillerInterval[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tempFiles, setTempFiles] = useState<string[]>([]);

  const handleStartProcessing = async () => {
    setIsProcessing(true);
    setError(null);
    const tempFilesToClean: string[] = [];

    try {
      // Step 1: Extract Audio
      setStep1Status("processing");
      const extractedAudioPath = await ipcClient.extractAudio({ videoPath });
      setAudioPath(extractedAudioPath);
      tempFilesToClean.push(extractedAudioPath);
      setStep1Status("complete");

      // Step 2: Whisper Transcription
      setStep2Status("processing");
      const transcription = await ipcClient.whisperTranscription({
        audioPath: extractedAudioPath,
      });
      setStep2Status("complete");

      // Step 3: GPT Filler Detection
      setStep3Status("processing");
      const intervals = await ipcClient.gptFillerDetection({
        words: transcription.words,
      });
      setFillerIntervals(intervals);
      setStep3Status("complete");

      // Step 4: Apply Muting
      setStep4Status("processing");
      const mutedVideoPath = await ipcClient.applyMuting({
        videoPath,
        fillerIntervals: intervals,
      });
      tempFilesToClean.push(mutedVideoPath);
      setStep4Status("complete");

      setTempFiles(tempFilesToClean);
      toast.success(
        `AI processing complete! Found ${intervals.length} filler words.`
      );
      onProcessingComplete(mutedVideoPath);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setError(errorMessage);
      toast.error(`AI processing failed: ${errorMessage}`);

      // Mark current step as error
      if (step1Status === "processing") setStep1Status("error");
      if (step2Status === "processing") setStep2Status("error");
      if (step3Status === "processing") setStep3Status("error");
      if (step4Status === "processing") setStep4Status("error");

      // Cleanup temp files on error
      if (tempFilesToClean.length > 0) {
        await ipcClient.cleanupTempFiles({ filePaths: tempFilesToClean });
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setStep1Status("pending");
    setStep2Status("pending");
    setStep3Status("pending");
    setStep4Status("pending");
    setAudioPath(null);
    setFillerIntervals([]);
    setError(null);

    // Cleanup temp files
    if (tempFiles.length > 0) {
      ipcClient.cleanupTempFiles({ filePaths: tempFiles });
      setTempFiles([]);
    }
  };

  const renderStepIcon = (status: StepStatus) => {
    switch (status) {
      case "pending":
        return <Circle className="h-5 w-5 text-gray-500" />;
      case "processing":
        return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />;
      case "complete":
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case "error":
        return <XCircle className="h-5 w-5 text-red-500" />;
    }
  };

  return (
    <div className="border-t border-gray-700 p-4 bg-gray-800">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">
          AI Filler Word Removal
        </h3>
        {!isProcessing && step1Status === "pending" && (
          <Button onClick={handleStartProcessing}>Process with AI</Button>
        )}
        {!isProcessing && step4Status === "complete" && (
          <Button onClick={handleReset} variant="outline">
            Reset
          </Button>
        )}
      </div>

      {/* Processing Steps */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          {renderStepIcon(step1Status)}
          <span className="text-gray-300">Step 1: Extract Audio</span>
        </div>
        <div className="flex items-center gap-3">
          {renderStepIcon(step2Status)}
          <span className="text-gray-300">Step 2: Whisper Transcription</span>
        </div>
        <div className="flex items-center gap-3">
          {renderStepIcon(step3Status)}
          <span className="text-gray-300">Step 3: Detect Filler Words</span>
        </div>
        <div className="flex items-center gap-3">
          {renderStepIcon(step4Status)}
          <span className="text-gray-300">Step 4: Apply Muting</span>
        </div>
      </div>

      {/* Filler Words Preview */}
      {fillerIntervals.length > 0 && (
        <div className="mt-4 p-3 bg-gray-900 rounded border border-gray-700">
          <h4 className="text-sm font-medium text-gray-300 mb-2">
            Detected Filler Words ({fillerIntervals.length}):
          </h4>
          <div className="flex flex-wrap gap-2">
            {fillerIntervals.slice(0, 10).map((interval, idx) => (
              <span
                key={idx}
                className="px-2 py-1 bg-gray-700 rounded text-xs text-gray-300"
              >
                "{interval.text}" at {interval.start.toFixed(1)}s
              </span>
            ))}
            {fillerIntervals.length > 10 && (
              <span className="px-2 py-1 text-xs text-gray-400">
                +{fillerIntervals.length - 10} more
              </span>
            )}
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mt-4 p-3 bg-red-900/20 border border-red-700 rounded">
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      {/* API Key Notice */}
      {step1Status === "pending" && (
        <div className="mt-4 p-3 bg-blue-900/20 border border-blue-700 rounded">
          <p className="text-sm text-blue-300">
            Make sure OPENAI_API_KEY is set in your environment variables.
          </p>
        </div>
      )}
    </div>
  );
}
```

### 4. Update Timeline Component

**File: `src/components/timeline/Timeline.tsx`**

Add AI component below video track:

```typescript
import { AIProcessor } from "../AIProcessor";

export function Timeline({ onSeek }: TimelineProps) {
  const { project, updateTrack } = useProjectStore();

  const handleAIComplete = (mutedVideoPath: string) => {
    // Update main track with AI-processed video
    updateTrack("main", {
      aiMutedPath: mutedVideoPath,
    });
    toast.success("AI-processed video ready! Use this version when exporting.");
  };

  return (
    <div className="space-y-4">
      <TimelineControls />

      <div className="bg-gray-900 border border-gray-700 rounded-lg overflow-x-auto">
        <TimeRuler duration={videoMetadata.duration} width={timelineWidth} />

        <div className="relative pb-4">
          <VideoTrack
            duration={videoMetadata.duration}
            width={timelineWidth}
            onSeek={onSeek}
          />
          <Playhead
            duration={videoMetadata.duration}
            width={timelineWidth}
            onSeek={onSeek}
          />
        </div>

        {/* AI Processor Component */}
        {project?.mainTrack?.path && (
          <AIProcessor
            videoPath={project.mainTrack.path}
            onProcessingComplete={handleAIComplete}
          />
        )}
      </div>
    </div>
  );
}
```

### 5. Update Project Store

**File: `src/store/useProjectStore.ts`**

Add AI-processed path to VideoTrack:

```typescript
export interface VideoTrack {
  id: string;
  source: "imported" | "screen" | "camera";
  path: string | null;
  metadata: VideoMetadata | null;
  startTime: number;
  endTime: number;
  aiMutedPath?: string | null; // AI-processed version
}
```

### 6. Update IPC Client

**File: `src/services/ipcClient.ts`**

Add AI methods:

```typescript
export const ipcClient = {
  // ... existing methods ...

  async extractAudio(params: { videoPath: string }): Promise<string> {
    try {
      const result = await window.api.invoke("ai.extractAudio", params);
      return result;
    } catch (error) {
      console.error("Failed to extract audio:", error);
      throw new Error("Failed to extract audio");
    }
  },

  async whisperTranscription(params: {
    audioPath: string;
  }): Promise<{
    text: string;
    words: Array<{ start: number; end: number; text: string }>;
  }> {
    try {
      const result = await window.api.invoke("ai.whisperTranscription", params);
      return result;
    } catch (error) {
      console.error("Failed to transcribe audio:", error);
      throw new Error("Failed to transcribe audio");
    }
  },

  async gptFillerDetection(params: {
    words: Array<{ start: number; end: number; text: string }>;
  }): Promise<Array<{ start: number; end: number; text: string }>> {
    try {
      const result = await window.api.invoke("ai.gptFillerDetection", params);
      return result;
    } catch (error) {
      console.error("Failed to detect filler words:", error);
      throw new Error("Failed to detect filler words");
    }
  },

  async applyMuting(params: {
    videoPath: string;
    fillerIntervals: Array<{ start: number; end: number; text: string }>;
  }): Promise<string> {
    try {
      const result = await window.api.invoke("ai.applyMuting", params);
      return result;
    } catch (error) {
      console.error("Failed to apply muting:", error);
      throw new Error("Failed to apply muting");
    }
  },

  async cleanupTempFiles(params: { filePaths: string[] }): Promise<void> {
    try {
      await window.api.invoke("ai.cleanupTempFiles", params);
    } catch (error) {
      console.error("Failed to cleanup temp files:", error);
    }
  },
};
```

### 7. Register IPC Handlers

**File: `electron/main.ts`**

Register AI handlers:

```typescript
import {
  handleExtractAudio,
  handleWhisperTranscription,
  handleGPTFillerDetection,
  handleApplyMuting,
  handleCleanupTempFiles,
} from "./ipcHandlers/aiHandlers";

// Add handlers
ipcMain.handle("ai.extractAudio", async (_, params) =>
  handleExtractAudio(params)
);
ipcMain.handle("ai.whisperTranscription", async (_, params) =>
  handleWhisperTranscription(params)
);
ipcMain.handle("ai.gptFillerDetection", async (_, params) =>
  handleGPTFillerDetection(params)
);
ipcMain.handle("ai.applyMuting", async (_, params) =>
  handleApplyMuting(params)
);
ipcMain.handle("ai.cleanupTempFiles", async (_, params) =>
  handleCleanupTempFiles(params)
);
```

### 8. Update Preload

**File: `electron/preload.ts`**

Whitelist AI channels:

```typescript
const validChannels = [
  // ... existing channels ...
  "ai.extractAudio",
  "ai.whisperTranscription",
  "ai.gptFillerDetection",
  "ai.applyMuting",
  "ai.cleanupTempFiles",
];
```

## Technical Details

### Audio Extraction (Step 1)

```bash
ffmpeg -y -i input.mp4 -vn -ar 16000 -ac 1 -c:a pcm_s16le output.wav
```

- 16kHz mono WAV for Whisper compatibility
- PCM encoding for best quality

### Whisper API (Step 2)

- Uses `verbose_json` with `timestamp_granularities: ["word"]`
- Flattens `segments[].words[]` into single array
- Returns only essential data: `{text, words: [{start, end, text}]}`

### GPT Filler Detection (Step 3)

- Sends only `{start, end, text}` objects to minimize tokens
- Uses `gpt-4o-mini` for cost efficiency
- Returns structured JSON with intervals array

### FFmpeg Muting (Step 4)

```bash
ffmpeg -y -i input.mp4 -af "volume=enable='between(t,1.2,1.5)':volume=0,volume=enable='between(t,3.1,3.4)':volume=0" -c:v copy output.mp4
```

- Comma-separated volume filters for multiple intervals
- Copies video without re-encoding for speed

## Files to Create

1. `electron/ipcHandlers/aiHandlers.ts` - AI processing handlers with OpenAI SDK
2. `src/components/AIProcessor.tsx` - AI UI component with 4-step progress

## Files to Modify

1. `src/components/timeline/Timeline.tsx` - Add AI component below track
2. `src/store/useProjectStore.ts` - Add aiMutedPath to VideoTrack
3. `src/services/ipcClient.ts` - Add AI methods
4. `electron/main.ts` - Register AI handlers
5. `electron/preload.ts` - Whitelist AI channels
6. `package.json` - Add openai dependency

## Security & Best Practices

- API key stored in `process.env.OPENAI_API_KEY` (never exposed to renderer)
- All API calls happen in main process
- Temp files stored in `app.getPath('temp')`
- Automatic cleanup of temp files on completion/error
- Proper error handling with user-friendly messages

## Error Handling

- Network failures: Show error with retry option
- Invalid API key: Clear message to check environment variable
- FFmpeg errors: Detailed error messages
- File permission issues: Graceful degradation
- Cleanup temp files on all error paths
