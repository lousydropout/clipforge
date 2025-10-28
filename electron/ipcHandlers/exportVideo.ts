import { dialog } from "electron";
import { handleClipVideo } from "./clipVideo";
import { ExportVideoRequest, FFmpegResult } from "../types";
import path from "path";

export async function handleExportVideo(
  params: ExportVideoRequest
): Promise<FFmpegResult> {
  try {
    console.log("Exporting video with params:", params);

    const { inputPath, startTime, endTime, scaleToHeight } = params;

    // Validate input parameters
    if (!inputPath) {
      return {
        success: false,
        error: "Input path is required",
      };
    }

    if (startTime < 0 || endTime <= startTime) {
      return {
        success: false,
        error:
          "Invalid time range: start time must be >= 0 and end time must be > start time",
      };
    }

    // Show save dialog to let user choose output location
    const result = await dialog.showSaveDialog({
      title: "Save Trimmed Video",
      defaultPath: generateDefaultFilename(inputPath),
      filters: [
        {
          name: "Video Files",
          extensions: ["mp4", "avi", "mov", "mkv", "webm"],
        },
        { name: "All Files", extensions: ["*"] },
      ],
    });

    if (result.canceled || !result.filePath) {
      return {
        success: false,
        error: "Export cancelled by user",
      };
    }

    const outputPath = result.filePath;

    // Call clipVideo handler with the selected output path
    const clipResult = await handleClipVideo({
      inputPath,
      outputPath,
      startTime,
      endTime,
      scaleToHeight,
    });

    return clipResult;
  } catch (error) {
    console.error("Error exporting video:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Unknown error occurred while exporting video",
    };
  }
}

// Helper function to generate a default filename for the export
function generateDefaultFilename(inputPath: string): string {
  const parsedPath = path.parse(inputPath);
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  return path.join(
    parsedPath.dir,
    `${parsedPath.name}_trimmed_${timestamp}.mp4`
  );
}
