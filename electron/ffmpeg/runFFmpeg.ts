import { spawn, ChildProcess } from "child_process";
import { BrowserWindow } from "electron";
import { FFmpegOptions, FFmpegProgressData, FFmpegResult } from "../types";

export async function runFFmpeg(options: FFmpegOptions): Promise<FFmpegResult> {
  return new Promise((resolve, reject) => {
    const { inputPath, outputPath, startTime, endTime, scaleToHeight } =
      options;

    // Build FFmpeg command
    const args = [
      "-ss",
      startTime.toString(),
      "-to",
      endTime.toString(),
      "-i",
      inputPath,
    ];

    // Add scaling if requested
    if (scaleToHeight) {
      args.push("-vf", `scale=-1:${scaleToHeight}`);
      args.push("-c:a", "copy");
    } else {
      // Use fast copy when no scaling
      args.push("-c", "copy");
    }

    args.push(outputPath);

    console.log("Running FFmpeg command:", "ffmpeg", args.join(" "));

    const ffmpeg: ChildProcess = spawn("ffmpeg", args);
    const mainWindow = BrowserWindow.getAllWindows()[0];

    let duration = 0;
    let lastProgress = 0;

    // Parse stderr for progress information
    ffmpeg.stderr.on("data", (data: Buffer) => {
      const output = data.toString();
      const lines = output.split("\n");

      for (const line of lines) {
        // Parse FFmpeg progress lines like: frame=123 fps=30 time=00:00:05.00 speed=1.5x
        const timeMatch = line.match(/time=(\d{2}):(\d{2}):(\d{2}\.\d{2})/);
        const speedMatch = line.match(/speed=([\d.]+)x/);

        if (timeMatch && mainWindow) {
          const hours = parseInt(timeMatch[1], 10);
          const minutes = parseInt(timeMatch[2], 10);
          const seconds = parseFloat(timeMatch[3]);
          const currentTime = hours * 3600 + minutes * 60 + seconds;

          // Calculate progress percentage
          if (duration > 0) {
            const progress = Math.min(
              100,
              Math.max(0, (currentTime / duration) * 100)
            );

            // Only send progress updates if it's significantly different
            if (Math.abs(progress - lastProgress) >= 1) {
              lastProgress = progress;

              const speed = speedMatch ? parseFloat(speedMatch[1]) : 1.0;
              const eta = speed > 0 ? (duration - currentTime) / speed : 0;

              const progressData: FFmpegProgressData = {
                progress: Math.round(progress),
                time: currentTime,
                speed,
                eta: Math.round(eta),
              };

              mainWindow.webContents.send("ffmpeg.progress", progressData);
            }
          }
        }
      }
    });

    // Handle FFmpeg completion
    ffmpeg.on("close", (code: number) => {
      if (code === 0) {
        console.log("FFmpeg completed successfully");
        resolve({
          success: true,
          outputPath,
        });
      } else {
        console.error(`FFmpeg failed with code ${code}`);
        reject(new Error(`FFmpeg process exited with code ${code}`));
      }
    });

    // Handle FFmpeg errors
    ffmpeg.on("error", (error: Error) => {
      console.error("FFmpeg spawn error:", error);
      reject(new Error(`Failed to start FFmpeg: ${error.message}`));
    });

    // Get video duration for progress calculation
    getVideoDuration(inputPath)
      .then((dur) => {
        duration = dur;
      })
      .catch((error) => {
        console.warn("Could not get video duration for progress:", error);
        // Continue without progress calculation
      });
  });
}

// Helper function to get video duration using ffprobe
async function getVideoDuration(videoPath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const ffprobe = spawn("ffprobe", [
      "-v",
      "quiet",
      "-print_format",
      "json",
      "-show_format",
      videoPath,
    ]);

    let output = "";
    let errorOutput = "";

    ffprobe.stdout.on("data", (data) => {
      output += data.toString();
    });

    ffprobe.stderr.on("data", (data) => {
      errorOutput += data.toString();
    });

    ffprobe.on("close", (code) => {
      if (code === 0) {
        try {
          const metadata = JSON.parse(output);
          const duration = parseFloat(metadata.format.duration) || 0;
          resolve(duration);
        } catch (error) {
          reject(new Error("Failed to parse video duration"));
        }
      } else {
        reject(new Error(`ffprobe failed with code ${code}: ${errorOutput}`));
      }
    });

    ffprobe.on("error", (error) => {
      reject(new Error(`Failed to start ffprobe: ${error.message}`));
    });
  });
}
