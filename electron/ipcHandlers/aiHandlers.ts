import OpenAI from "openai";
import { spawn } from "child_process";
import { createReadStream } from "fs";
import { unlink } from "fs/promises";
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
  try {
    console.log("🎤 Starting Whisper transcription for:", params.audioPath);

    const transcription = await openai.audio.transcriptions.create({
      file: createReadStream(params.audioPath),
      model: "whisper-1",
      response_format: "verbose_json",
      timestamp_granularities: ["word"],
    });

    console.log(
      "🔍 Full Whisper API response:",
      JSON.stringify(transcription, null, 2)
    );
    console.log(
      "📊 Transcription segments count:",
      transcription.segments?.length || 0
    );

    // Extract words from the top-level words array
    const words: WhisperWord[] = [];

    // Check if words are at the top level (new format)
    if (transcription.words && Array.isArray(transcription.words)) {
      console.log(
        "📝 Processing top-level words array:",
        transcription.words.length
      );
      for (const word of transcription.words) {
        console.log("🔤 Processing word:", {
          start: word.start,
          end: word.end,
          text: word.word,
        });
        words.push({
          start: word.start,
          end: word.end,
          text: word.word,
        });
      }
    }
    // Fallback: check segments[].words[] (old format)
    else if (transcription.segments) {
      console.log(
        "📝 Processing segments array:",
        transcription.segments.length
      );
      for (const segment of transcription.segments) {
        console.log("📝 Processing segment:", {
          start: segment.start,
          end: segment.end,
          text: segment.text,
          hasWords: !!(segment as any).words,
          wordsCount: (segment as any).words?.length || 0,
        });

        if ((segment as any).words) {
          for (const word of (segment as any).words) {
            console.log("🔤 Processing word:", {
              start: word.start,
              end: word.end,
              text: word.word,
            });
            words.push({
              start: word.start,
              end: word.end,
              text: word.word,
            });
          }
        }
      }
    }

    console.log("✅ Extracted words count:", words.length);
    console.debug("📋 All extracted words:", words);

    return {
      text: transcription.text,
      words: words,
    };
  } catch (error: any) {
    console.error(
      "Whisper API error:",
      error.response?.data?.error?.message || error.message
    );
    throw new Error(
      `Whisper transcription failed: ${
        error.response?.data?.error?.message || error.message
      }`
    );
  }
}

// Helper function to normalize text for comparison
function normalizeWord(word: string): string {
  return word.toLowerCase().replace(/[^\w]/g, "");
}

// Align Whisper words with GPT cleaned text to find fillers
function alignAndFindFillers(
  whisperWords: WhisperWord[],
  cleanedText: string
): FillerInterval[] {
  const fillerIntervals: FillerInterval[] = [];

  // Normalize cleaned text and split into words
  const cleanedWords = cleanedText
    .split(/\s+/)
    .map((w) => normalizeWord(w))
    .filter((w) => w.length > 0);

  let cleanedIndex = 0;

  for (const whisperWord of whisperWords) {
    const normalizedWhisper = normalizeWord(whisperWord.text);

    // Skip empty normalized words
    if (normalizedWhisper.length === 0) continue;

    // Check if current whisper word matches current position in cleaned text
    if (
      cleanedIndex < cleanedWords.length &&
      normalizedWhisper === cleanedWords[cleanedIndex]
    ) {
      // Word found in cleaned text - advance cleaned index
      cleanedIndex++;
    } else {
      // Word not found in cleaned text - it's a filler word
      fillerIntervals.push({
        start: whisperWord.start,
        end: whisperWord.end,
        text: whisperWord.text,
      });
      console.log(
        `🗑️  Filler detected: "${
          whisperWord.text
        }" at ${whisperWord.start.toFixed(2)}s - ${whisperWord.end.toFixed(2)}s`
      );
    }
  }

  return fillerIntervals;
}

// Step 3: GPT filler detection with text alignment
export async function handleGPTFillerDetection(params: {
  text: string;
  words: WhisperWord[];
}): Promise<FillerInterval[]> {
  try {
    console.log("🔍 GPT filler detection - original text:", params.text);

    // Send only text to GPT for cleaning
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0,
      messages: [
        {
          role: "system",
          content: `You are a precise text editor.
Remove filler words such as "uh", "um", "like", "you know", "so", "well", "actually", "basically", "literally".
Keep all other words in the exact same order and format.
Return ONLY the cleaned text.`,
        },
        { role: "user", content: params.text },
      ],
    });

    const cleanedText = response.choices[0].message.content?.trim() || "";
    console.log("🧹 GPT cleaned text:", cleanedText);

    // Perform local alignment to find deleted words
    const fillerIntervals = alignAndFindFillers(params.words, cleanedText);

    console.log(
      `✅ Detected ${fillerIntervals.length} filler words via text alignment`
    );

    // Log summary of what will be removed
    if (fillerIntervals.length > 0) {
      console.log("🗑️  Summary of words to be removed:");
      fillerIntervals.forEach((interval, index) => {
        console.log(
          `  ${index + 1}. "${interval.text}" (${interval.start.toFixed(
            2
          )}s - ${interval.end.toFixed(2)}s)`
        );
      });
    } else {
      console.log("✨ No filler words detected - no muting needed");
    }

    return fillerIntervals;
  } catch (error: any) {
    const msg =
      error.response?.data?.error?.message || error.message || "Unknown error";
    console.error("GPT API error:", msg);
    throw new Error(`GPT filler detection failed: ${msg}`);
  }
}

// Step 4: Apply muting with correct FFmpeg filter syntax
export async function handleApplyMuting(params: {
  videoPath: string;
  fillerIntervals: FillerInterval[];
}): Promise<string> {
  const tempDir = app.getPath("temp");
  const outputPath = join(tempDir, `muted_${Date.now()}.mp4`);

  console.log("🎵 Applying muting to video:", params.videoPath);
  console.log("📝 Filler intervals to mute:");

  // Log each filler interval that will be muted
  params.fillerIntervals.forEach((interval, index) => {
    console.log(
      `  ${index + 1}. "${interval.text}" from ${interval.start.toFixed(
        2
      )}s to ${interval.end.toFixed(2)}s`
    );
  });

  // Build volume filter string with comma-separated filters
  const volumeFilters = params.fillerIntervals
    .map(
      (interval) =>
        `volume=enable='between(t,${interval.start},${interval.end})':volume=0`
    )
    .join(",");

  // Log the complete FFmpeg command
  const ffmpegCommand = [
    "ffmpeg",
    "-y",
    "-i",
    params.videoPath,
    "-af",
    volumeFilters,
    "-c:v",
    "copy",
    outputPath,
  ];

  console.log("🔧 FFmpeg command:");
  console.log(ffmpegCommand.join(" "));
  console.log("📊 Volume filters:", volumeFilters);

  return new Promise((resolve, reject) => {
    const ffmpeg = spawn("ffmpeg", ffmpegCommand.slice(1)); // Remove 'ffmpeg' from the command array

    let errorOutput = "";
    ffmpeg.stderr.on("data", (data) => {
      errorOutput += data.toString();
    });

    ffmpeg.on("close", (code) => {
      if (code === 0) {
        console.log("✅ Muting completed successfully:", outputPath);
        resolve(outputPath);
      } else {
        console.error("❌ Muting failed with code:", code);
        console.error("Error output:", errorOutput);
        reject(new Error(`Muting failed: ${errorOutput}`));
      }
    });

    ffmpeg.on("error", (error) => {
      console.error("❌ FFmpeg process error:", error.message);
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
