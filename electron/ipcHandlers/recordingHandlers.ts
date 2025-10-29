import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { spawn } from "child_process";
import { desktopCapturer, dialog } from "electron";
import { VideoMetadata } from "../types";

export interface SaveRecordingRequest {
  buffer: ArrayBuffer;
  filename: string;
}

export interface SaveRecordingResponse {
  success: boolean;
  filePath?: string;
  error?: string;
}

/**
 * Save recording blob to temporary file
 */
export async function handleSaveFile(params: SaveRecordingRequest): Promise<SaveRecordingResponse> {
  try {
    const { buffer, filename } = params;

    // Create temp directory if it doesn't exist
    const tempDir = join(tmpdir(), "clipforge-recordings");
    await mkdir(tempDir, { recursive: true });

    // Generate unique filename
    const timestamp = Date.now();
    const name = filename.replace(/\.webm$/, `_${timestamp}.webm`);
    const filePath = join(tempDir, name);

    // Write buffer to file
    const bufferData = Buffer.from(buffer);
    await writeFile(filePath, bufferData);

    console.log("Recording saved to:", filePath);
    return {
      success: true,
      filePath: filePath,
    };
  } catch (error) {
    console.error("Failed to save recording:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to save recording file",
    };
  }
}

/**
 * Get metadata for a recorded file using FFprobe
 */
export async function getRecordingMetadata(filePath: string): Promise<VideoMetadata> {
  return new Promise((resolve) => {
    console.log("Extracting metadata for:", filePath);
    
    const ffprobe = spawn("ffprobe", [
      "-v",
      "quiet",
      "-print_format",
      "json",
      "-show_format",
      "-show_streams",
      filePath,
    ]);

    let output = "";
    let errOut = "";

    ffprobe.stdout.on("data", (data) => {
      output += data;
    });

    ffprobe.stderr.on("data", (data) => {
      errOut += data;
    });

    ffprobe.on("close", (code) => {
      if (code === 0) {
        try {
          const metadata = JSON.parse(output);
          const videoStream = metadata.streams.find(
            (stream: any) => stream.codec_type === "video"
          );

          if (!videoStream) {
            console.warn("No video stream found, using fallback metadata");
            // Fallback metadata for WebM files
            const result: VideoMetadata = {
              duration: parseFloat(metadata.format.duration) || 10, // Default 10 seconds
              width: 1920, // Default HD width
              height: 1080, // Default HD height
              format: "webm",
              bitrate: 0,
              fps: 30, // Default 30 fps
            };
            console.log("Using fallback metadata:", result);
            resolve(result);
            return;
          }

          // Parse frame rate
          const parseFrameRate = (frameRate: string): number => {
            if (!frameRate) return 30;
            if (frameRate.includes("/")) {
              const [numerator, denominator] = frameRate.split("/").map(Number);
              return denominator !== 0 ? numerator / denominator : 30;
            }
            return parseFloat(frameRate) || 30;
          };

          const result: VideoMetadata = {
            duration: parseFloat(metadata.format.duration) || 10,
            width: videoStream.width || 1920,
            height: videoStream.height || 1080,
            format: metadata.format.format_name || "webm",
            bitrate: parseInt(metadata.format.bit_rate) || 0,
            fps: parseFrameRate(videoStream.r_frame_rate),
          };

          console.log("Recording metadata extracted:", result);
          resolve(result);
        } catch (parseError) {
          console.error("Failed to parse recording metadata:", parseError);
          console.log("Raw output:", output);
          console.log("Error output:", errOut);
          
          // Fallback metadata
          const result: VideoMetadata = {
            duration: 10,
            width: 1920,
            height: 1080,
            format: "webm",
            bitrate: 0,
            fps: 30,
          };
          console.log("Using fallback metadata due to parse error:", result);
          resolve(result);
        }
      } else {
        console.error(`FFprobe failed with code ${code}:`, errOut);
        console.log("Raw output:", output);
        
        // Fallback metadata
        const result: VideoMetadata = {
          duration: 10,
          width: 1920,
          height: 1080,
          format: "webm",
          bitrate: 0,
          fps: 30,
        };
        console.log("Using fallback metadata due to FFprobe failure:", result);
        resolve(result);
      }
    });

    ffprobe.on("error", (error) => {
      console.error("FFprobe process error:", error);
      // Fallback metadata
      const result: VideoMetadata = {
        duration: 10,
        width: 1920,
        height: 1080,
        format: "webm",
        bitrate: 0,
        fps: 30,
      };
      console.log("Using fallback metadata due to process error:", result);
      resolve(result);
    });
  });
}

/**
 * Convert WebM file to MP4 for better compatibility
 */
export async function handleConvertWebmToMp4(params: { webmPath: string; mp4Filename: string }): Promise<string> {
  try {
    const { webmPath, mp4Filename } = params;
    
    // Create temp directory if it doesn't exist
    const tempDir = join(tmpdir(), "clipforge-recordings");
    await mkdir(tempDir, { recursive: true });
    
    const mp4Path = join(tempDir, mp4Filename);
    
    // Use FFmpeg to convert WebM to MP4 with optimized settings for speed
    const ffmpeg = spawn("ffmpeg", [
      "-i", webmPath,
      "-c:v", "libx264",
      "-c:a", "aac",
      "-preset", "ultrafast", // Much faster encoding
      "-crf", "28", // Slightly lower quality but much faster
      "-movflags", "+faststart", // Optimize for web playback
      "-y", // Overwrite output file
      mp4Path
    ]);

    return new Promise((resolve, reject) => {
      let errorOutput = "";

      ffmpeg.stderr.on("data", (data) => {
        errorOutput += data.toString();
      });

      ffmpeg.on("close", (code) => {
        if (code === 0) {
          console.log("WebM to MP4 conversion successful:", mp4Path);
          resolve(mp4Path);
        } else {
          console.error("FFmpeg conversion failed with code:", code);
          console.error("Error output:", errorOutput);
          reject(new Error(`FFmpeg conversion failed: ${errorOutput}`));
        }
      });

      ffmpeg.on("error", (error) => {
        console.error("FFmpeg process error:", error);
        reject(new Error("FFmpeg process failed"));
      });
    });
  } catch (error) {
    console.error("Failed to convert WebM to MP4:", error);
    throw new Error("Failed to convert WebM to MP4");
  }
}

/**
 * Get available screen sources using desktopCapturer
 */
export async function handleGetSources(): Promise<{ id: string; name: string; thumbnail: string }[]> {
  try {
    const sources = await desktopCapturer.getSources({
      types: ["screen", "window"],
      thumbnailSize: { width: 150, height: 150 }
    });

    return sources.map(source => ({
      id: source.id,
      name: source.name,
      thumbnail: source.thumbnail.toDataURL()
    }));
  } catch (error) {
    console.error("Failed to get screen sources:", error);
    throw new Error("Failed to get screen sources");
  }
}

/**
 * Show source selection dialog
 */
export async function showSourceSelectionDialog(): Promise<string | null> {
  try {
    const sources = await desktopCapturer.getSources({
      types: ["screen", "window"],
      thumbnailSize: { width: 150, height: 150 }
    });

    if (sources.length === 0) {
      throw new Error("No screen sources available");
    }

    // If only one source, return it directly
    if (sources.length === 1) {
      return sources[0].id;
    }

    // For multiple sources, we'll need to show a dialog
    // Use Electron's built-in dialog to show a simple selection
    const choice = await dialog.showMessageBox({
      type: 'question',
      buttons: sources.map(source => source.name),
      defaultId: 0,
      title: 'Select Screen Source',
      message: 'Choose which screen or window to record:',
      detail: 'Select the source you want to record from the list below.'
    });

    if (choice.response >= 0 && choice.response < sources.length) {
      return sources[choice.response].id;
    }

    return null; // User cancelled
  } catch (error) {
    console.error("Failed to show source selection dialog:", error);
    throw new Error("Failed to show source selection dialog");
  }
}

