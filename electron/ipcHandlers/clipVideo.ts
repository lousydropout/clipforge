import { runFFmpeg } from "../ffmpeg/runFFmpeg";
import { VideoClipParams, FFmpegResult } from "../types";

export async function handleClipVideo(
  params: VideoClipParams
): Promise<FFmpegResult> {
  try {
    console.log("Clipping video with params:", params);
    console.log("ClipVideo - playbackSpeed:", params.playbackSpeed);

    const {
      inputPath,
      outputPath,
      startTime,
      endTime,
      scaleToHeight,
      scaleFactor,
      playbackSpeed,
    } = params;

    // Validate parameters
    if (!inputPath || !outputPath) {
      return {
        success: false,
        error: "Input and output paths are required",
      };
    }

    if (startTime < 0 || endTime <= startTime) {
      return {
        success: false,
        error:
          "Invalid time range: start time must be >= 0 and end time must be > start time",
      };
    }

    // Run FFmpeg with the provided parameters
    const result = await runFFmpeg({
      inputPath,
      outputPath,
      startTime,
      endTime,
      scaleToHeight,
      scaleFactor,
      playbackSpeed,
    });

    console.log("Video clipping completed:", result);
    return result;
  } catch (error) {
    console.error("Error clipping video:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Unknown error occurred while clipping video",
    };
  }
}
