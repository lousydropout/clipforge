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
  word: string; // Keep field name 'word' to match Whisper API response
}

interface WhisperResponse {
  text: string;
  words: WhisperWord[];
}

interface SentenceSegment {
  text: string;
  start: number;
  end: number;
}

interface ShortSuggestion {
  sentence: string;
  start: number;
  end: number;
  score: number;
  reason: string;
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
          word: word.word,
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
              word: word.word,
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
    const normalizedWhisper = normalizeWord(whisperWord.word);

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
        text: whisperWord.word,
      });
      console.log(
        `🗑️  Filler detected: "${
          whisperWord.word
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

export interface UntranscribedInterval {
  start: number;
  end: number;
}

// Step 2.5: Calculate untranscribed intervals (gaps between words)
export async function handleMuteUntranscribedIntervals(params: {
  words: WhisperWord[];
  duration: number;
  muteStrength?: number; // 0 = full mute (default), -20 = reduce by 20dB
}): Promise<UntranscribedInterval[]> {
  const intervals: UntranscribedInterval[] = [];

  console.log(
    `Calculating untranscribed intervals for ${params.words.length} words over ${params.duration}s`
  );

  // Add initial gap (0 to first word)
  if (params.words.length > 0 && params.words[0].start > 0.1) {
    intervals.push({ start: 0, end: params.words[0].start });
    console.log(`Initial gap: 0s - ${params.words[0].start}s`);
  }

  // Find gaps between words
  for (let i = 0; i < params.words.length - 1; i++) {
    const currentEnd = params.words[i].end;
    const nextStart = params.words[i + 1].start;
    const gap = nextStart - currentEnd;

    // Only mute gaps larger than 0.1 seconds
    if (gap > 0.1) {
      intervals.push({ start: currentEnd, end: nextStart });
      console.log(
        `Gap between words: ${currentEnd}s - ${nextStart}s (${gap.toFixed(2)}s)`
      );
    }
  }

  // Add final gap (last word to end)
  if (params.words.length > 0) {
    const lastWord = params.words[params.words.length - 1];
    if (lastWord.end < params.duration - 0.1) {
      intervals.push({ start: lastWord.end, end: params.duration });
      console.log(`Final gap: ${lastWord.end}s - ${params.duration}s`);
    }
  }

  console.log(`Found ${intervals.length} untranscribed intervals to mute`);
  return intervals;
}

// Step 4.5: Apply muting to untranscribed intervals
export async function handleApplyUntranscribedMuting(params: {
  videoPath: string;
  intervals: UntranscribedInterval[];
  muteStrength?: number;
}): Promise<string> {
  const tempDir = app.getPath("temp");
  const outputPath = join(tempDir, `muted_untranscribed_${Date.now()}.mp4`);
  const muteStrength = params.muteStrength ?? 0;

  console.log("Applying muting to untranscribed intervals");
  console.log(`Intervals to mute: ${params.intervals.length}`);

  // Log each interval that will be muted
  params.intervals.forEach((interval, index) => {
    console.log(
      `  ${index + 1}. ${interval.start.toFixed(2)}s - ${interval.end.toFixed(
        2
      )}s (${(interval.end - interval.start).toFixed(2)}s)`
    );
  });

  // Build volume filter string
  const volumeFilters = params.intervals
    .map((interval) => {
      const volumeValue = muteStrength === 0 ? 0 : `${muteStrength}dB`;
      return `volume=enable='between(t,${interval.start},${interval.end})':volume=${volumeValue}`;
    })
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
        console.log(
          "✅ Untranscribed muting completed successfully:",
          outputPath
        );
        resolve(outputPath);
      } else {
        console.error("❌ Untranscribed muting failed with code:", code);
        console.error("Error output:", errorOutput);
        reject(new Error(`Untranscribed muting failed: ${errorOutput}`));
      }
    });

    ffmpeg.on("error", (error) => {
      console.error("❌ FFmpeg process error:", error.message);
      reject(new Error(`FFmpeg process error: ${error.message}`));
    });
  });
}

// Step 3: Segment transcript into sentences
export async function handleSegmentTranscript(params: {
  words: WhisperWord[];
  fullText: string;
}): Promise<SentenceSegment[]> {
  const sentences: SentenceSegment[] = [];
  const words = params.words;
  const fullText = params.fullText;

  if (words.length === 0 || !fullText) {
    return sentences;
  }

  // Split the full text into sentences using punctuation
  const sentenceTexts = fullText
    .split(/[.!?]+/)
    .map(s => s.trim())
    .filter(s => s.length > 0);

  console.log(`🔍 Found ${sentenceTexts.length} sentences in full text:`, sentenceTexts);

  // Map each sentence text to word timestamps
  let wordIndex = 0;
  
  for (const sentenceText of sentenceTexts) {
    const sentenceWords: WhisperWord[] = [];
    const sentenceStart = wordIndex < words.length ? words[wordIndex].start : 0;
    
    // Find words that match this sentence
    const wordsToMatch = sentenceText.toLowerCase().split(/\s+/);
    let matchedWords = 0;
    let tempWordIndex = wordIndex; // Use temporary index to avoid skipping words
    
    while (tempWordIndex < words.length && matchedWords < wordsToMatch.length) {
      const word = words[tempWordIndex];
      const wordText = word.word.toLowerCase().replace(/[^\w]/g, ''); // Remove punctuation for matching
      const targetWord = wordsToMatch[matchedWords].replace(/[^\w]/g, '');
      
      if (wordText === targetWord) {
        sentenceWords.push(word);
        matchedWords++;
        wordIndex = tempWordIndex + 1; // Only advance wordIndex when we find a match
      }
      tempWordIndex++; // Always advance tempWordIndex to search through all words
    }
    
    if (sentenceWords.length > 0) {
      const sentenceEnd = sentenceWords[sentenceWords.length - 1].end;
      sentences.push({
        text: sentenceText,
        start: sentenceStart,
        end: sentenceEnd,
      });
    }
  }

  console.log(
    `✅ Segmented ${words.length} words into ${sentences.length} sentences`
  );
  return sentences;
}

// Step 4: GPT-based short suggestions
export async function handleGPTShortSuggestions(params: {
  sentences: SentenceSegment[];
}): Promise<ShortSuggestion[]> {
  // Prepare input with IDs for stable matching
  const input = params.sentences.map((s, i) => ({
    id: i,
    text: s.text,
    start: s.start,
    end: s.end,
  }));

  const prompt = JSON.stringify({ sentences: input });

  const response = await openai.chat.completions.create({
    model: "gpt-4.1-mini",
    temperature: 0,
    messages: [
      {
        role: "system",
        content: `You are analyzing sentences from a video transcript.
Rate how well each sentence stands alone as a short clip for social media.
Only output valid JSON with this exact schema:
[{"id": 0, "sentence": "...", "score": 0.0-1.0, "reason": "..."}]
Do not include any commentary or explanations outside the JSON.`,
      },
      { role: "user", content: prompt },
    ],
  });

  const raw = response.choices[0].message.content?.trim() || "";

  // Safe JSON parsing with regex extraction
  let parsed: Array<{
    id: number;
    sentence: string;
    score: number;
    reason: string;
  }> = [];
  try {
    const match = raw.match(/\[.*\]/s);
    if (match) {
      parsed = JSON.parse(match[0]);
    } else {
      console.warn("No JSON found in GPT response:", raw.slice(0, 300));
    }
  } catch (err) {
    console.warn("Failed to parse GPT response:", raw.slice(0, 300));
    console.error(err);
  }

  // Merge parsed data with original timestamps
  const suggestions: ShortSuggestion[] = parsed
    .map((item) => {
      const ref = input[item.id];
      if (!ref) return null;
      return {
        sentence: item.sentence || ref.text,
        start: ref.start,
        end: ref.end,
        score: Math.min(Math.max(item.score ?? 0, 0), 1),
        reason: item.reason || "",
      };
    })
    .filter((s): s is ShortSuggestion => !!s);

  return suggestions;
}

// Helper function to process a batch of sentences
export async function processBatch(
  sentences: SentenceSegment[]
): Promise<ShortSuggestion[]> {
  const prompt = JSON.stringify({
    sentences: sentences.map((s) => ({
      text: s.text,
      start: s.start,
      end: s.end,
    })),
  });

  const response = await openai.chat.completions.create({
    model: "gpt-4.1-mini",
    temperature: 0,
    messages: [
      {
        role: "system",
        content: `You are analyzing sentences from a video transcript. 
Mark which sentences are self-contained, emotionally engaging, or insightful enough to stand alone as short clips for social media.
Return structured JSON: [{"sentence": "...", "score": 0.0-1.0, "reason": "..."}].
Only score sentences in the provided list.`,
      },
      { role: "user", content: prompt },
    ],
  });

  const responseText = response.choices[0].message.content?.trim() || "";

  // Safe JSON parsing with regex extraction
  let parsed: Array<{ sentence: string; score: number; reason: string }> = [];
  try {
    const match = responseText.match(/\[.*\]/s);
    if (match) {
      parsed = JSON.parse(match[0].trim());
    } else {
      console.warn(
        "GPT short suggestion parse error - no JSON array found:",
        responseText
      );
      parsed = [];
    }
  } catch (parseError) {
    console.warn("GPT short suggestion parse error:", responseText);
    console.error("Parse error details:", parseError);
    parsed = [];
  }

  // Merge parsed suggestions with timestamp data from input sentences
  const suggestions: ShortSuggestion[] = [];
  for (const parsedItem of parsed) {
    // Find matching sentence by text
    const matchingSentence = sentences.find(
      (s) =>
        s.text.trim().toLowerCase() === parsedItem.sentence.trim().toLowerCase()
    );

    if (matchingSentence) {
      suggestions.push({
        sentence: parsedItem.sentence,
        start: matchingSentence.start,
        end: matchingSentence.end,
        score: parsedItem.score,
        reason: parsedItem.reason,
      });
    }
  }

  return suggestions;
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
