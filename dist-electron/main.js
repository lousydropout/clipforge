import { BrowserWindow, dialog, app, ipcMain } from "electron";
import { fileURLToPath } from "node:url";
import path$1 from "node:path";
import { spawn } from "child_process";
import path from "path";
async function runFFmpeg(options) {
  return new Promise((resolve2, reject2) => {
    const { inputPath, outputPath, startTime, endTime, scaleToHeight } = options;
    const args = [
      "-ss",
      startTime.toString(),
      "-to",
      endTime.toString(),
      "-i",
      inputPath
    ];
    if (scaleToHeight) {
      args.push("-vf", `scale=-1:${scaleToHeight}`);
      args.push("-c:a", "copy");
    } else {
      args.push("-c", "copy");
    }
    args.push(outputPath);
    console.log("Running FFmpeg command:", "ffmpeg", args.join(" "));
    const ffmpeg = spawn("ffmpeg", args);
    const mainWindow = BrowserWindow.getAllWindows()[0];
    let duration = 0;
    let lastProgress = 0;
    ffmpeg.stderr.on("data", (data) => {
      const output2 = data.toString();
      const lines = output2.split("\n");
      for (const line of lines) {
        const timeMatch = line.match(/time=(\d{2}):(\d{2}):(\d{2}\.\d{2})/);
        const speedMatch = line.match(/speed=([\d.]+)x/);
        if (timeMatch && mainWindow) {
          const hours = parseInt(timeMatch[1], 10);
          const minutes = parseInt(timeMatch[2], 10);
          const seconds = parseFloat(timeMatch[3]);
          const currentTime = hours * 3600 + minutes * 60 + seconds;
          if (duration > 0) {
            const progress = Math.min(100, Math.max(0, currentTime / duration * 100));
            if (Math.abs(progress - lastProgress) >= 1) {
              lastProgress = progress;
              const speed = speedMatch ? parseFloat(speedMatch[1]) : 1;
              const eta = speed > 0 ? (duration - currentTime) / speed : 0;
              const progressData = {
                progress: Math.round(progress),
                time: currentTime,
                speed,
                eta: Math.round(eta)
              };
              mainWindow.webContents.send("ffmpeg.progress", progressData);
            }
          }
        }
      }
    });
    ffmpeg.on("close", (code2) => {
      if (code2 === 0) {
        console.log("FFmpeg completed successfully");
        resolve2({
          success: true,
          outputPath
        });
      } else {
        console.error(`FFmpeg failed with code ${code2}`);
        reject2(new Error(`FFmpeg process exited with code ${code2}`));
      }
    });
    ffmpeg.on("error", (error) => {
      console.error("FFmpeg spawn error:", error);
      reject2(new Error(`Failed to start FFmpeg: ${error.message}`));
    });
    getVideoDuration(inputPath).then((dur) => {
      duration = dur;
    }).catch((error) => {
      console.warn("Could not get video duration for progress:", error);
    });
  });
}
async function getVideoDuration(videoPath2) {
  return new Promise((resolve2, reject2) => {
    const ffprobe2 = spawn("ffprobe", [
      "-v",
      "quiet",
      "-print_format",
      "json",
      "-show_format",
      videoPath2
    ]);
    let output2 = "";
    let errorOutput2 = "";
    ffprobe2.stdout.on("data", (data) => {
      output2 += data.toString();
    });
    ffprobe2.stderr.on("data", (data) => {
      errorOutput2 += data.toString();
    });
    ffprobe2.on("close", (code2) => {
      if (code2 === 0) {
        try {
          const metadata2 = JSON.parse(output2);
          const duration = parseFloat(metadata2.format.duration) || 0;
          resolve2(duration);
        } catch (error) {
          reject2(new Error("Failed to parse video duration"));
        }
      } else {
        reject2(new Error(`ffprobe failed with code ${code2}: ${errorOutput2}`));
      }
    });
    ffprobe2.on("error", (error) => {
      reject2(new Error(`Failed to start ffprobe: ${error.message}`));
    });
  });
}
async function handleClipVideo(params) {
  try {
    console.log("Clipping video with params:", params);
    const { inputPath, outputPath, startTime, endTime, scaleToHeight } = params;
    if (!inputPath || !outputPath) {
      return {
        success: false,
        error: "Input and output paths are required"
      };
    }
    if (startTime < 0 || endTime <= startTime) {
      return {
        success: false,
        error: "Invalid time range: start time must be >= 0 and end time must be > start time"
      };
    }
    const result = await runFFmpeg({
      inputPath,
      outputPath,
      startTime,
      endTime,
      scaleToHeight
    });
    console.log("Video clipping completed:", result);
    return result;
  } catch (error) {
    console.error("Error clipping video:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred while clipping video"
    };
  }
}
async function handleExportVideo(params) {
  try {
    console.log("Exporting video with params:", params);
    const { inputPath, startTime, endTime, scaleToHeight } = params;
    if (!inputPath) {
      return {
        success: false,
        error: "Input path is required"
      };
    }
    if (startTime < 0 || endTime <= startTime) {
      return {
        success: false,
        error: "Invalid time range: start time must be >= 0 and end time must be > start time"
      };
    }
    const result = await dialog.showSaveDialog({
      title: "Save Trimmed Video",
      defaultPath: generateDefaultFilename(inputPath),
      filters: [
        {
          name: "Video Files",
          extensions: ["mp4", "avi", "mov", "mkv", "webm"]
        },
        { name: "All Files", extensions: ["*"] }
      ]
    });
    if (result.canceled || !result.filePath) {
      return {
        success: false,
        error: "Export cancelled by user"
      };
    }
    const outputPath = result.filePath;
    const clipResult = await handleClipVideo({
      inputPath,
      outputPath,
      startTime,
      endTime,
      scaleToHeight
    });
    return clipResult;
  } catch (error) {
    console.error("Error exporting video:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred while exporting video"
    };
  }
}
function generateDefaultFilename(inputPath) {
  const parsedPath = path.parse(inputPath);
  const timestamp = (/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-").slice(0, 19);
  return path.join(parsedPath.dir, `${parsedPath.name}_trimmed_${timestamp}.mp4`);
}
const __dirname = path$1.dirname(fileURLToPath(import.meta.url));
process.env.APP_ROOT = path$1.join(__dirname, "..");
const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
const MAIN_DIST = path$1.join(process.env.APP_ROOT, "dist-electron");
const RENDERER_DIST = path$1.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path$1.join(process.env.APP_ROOT, "public") : RENDERER_DIST;
let win;
function createWindow() {
  win = new BrowserWindow({
    icon: path$1.join(process.env.VITE_PUBLIC, "electron-vite.svg"),
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: path$1.join(__dirname, "preload.mjs"),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false
      // Allow local file access
    }
  });
  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path$1.join(RENDERER_DIST, "index.html"));
  }
}
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
    win = null;
  }
});
app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
ipcMain.handle("video.import", async () => {
  try {
    const result = await dialog.showOpenDialog({
      properties: ["openFile"],
      filters: [
        {
          name: "Video Files",
          extensions: ["mp4", "avi", "mov", "mkv", "webm"]
        },
        { name: "All Files", extensions: ["*"] }
      ]
    });
    if (result.canceled || !result.filePaths.length) {
      return { success: false, error: "No file selected" };
    }
    const videoPath2 = result.filePaths[0];
    try {
      const metadata2 = await getVideoMetadata(videoPath2);
      console.log("Video metadata extracted:", metadata2);
      return {
        success: true,
        videoPath: videoPath2,
        metadata: metadata2
      };
    } catch (error) {
      console.error("Failed to extract video metadata:", error);
      return {
        success: true,
        videoPath: videoPath2,
        metadata: {
          duration: 0,
          width: 0,
          height: 0,
          format: "unknown",
          bitrate: 0,
          fps: 0
        }
      };
    }
  } catch (error) {
    console.error("Error importing video:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
});
ipcMain.handle("video.clip", async (_, params) => {
  return handleClipVideo(params);
});
ipcMain.handle("video.export", async (_, params) => {
  return handleExportVideo(params);
});
async function getVideoMetadata(videoPath) {
  return new Promise((resolve, reject) => {
    const ffprobe = spawn("ffprobe", [
      "-v",
      "quiet",
      "-print_format",
      "json",
      "-show_format",
      "-show_streams",
      videoPath
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
          const videoStream = metadata.streams.find(
            (stream) => stream.codec_type === "video"
          );
          if (videoStream) {
            resolve({
              duration: parseFloat(metadata.format.duration) || 0,
              width: videoStream.width || 0,
              height: videoStream.height || 0,
              format: metadata.format.format_name || "unknown",
              bitrate: parseInt(metadata.format.bit_rate) || 0,
              fps: eval(videoStream.r_frame_rate) || 0
            });
          } else {
            reject(new Error("No video stream found"));
          }
        } catch (error) {
          reject(new Error("Failed to parse video metadata"));
        }
      } else {
        reject(new Error(`ffprobe failed with code ${code}: ${errorOutput}`));
      }
    });
  });
}
app.whenReady().then(createWindow);
export {
  MAIN_DIST,
  RENDERER_DIST,
  VITE_DEV_SERVER_URL
};
