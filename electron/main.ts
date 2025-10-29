import { app, BrowserWindow, ipcMain, dialog } from "electron";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { spawn } from "child_process";
import { handleClipVideo } from "./ipcHandlers/clipVideo";
import { handleExportVideo } from "./ipcHandlers/exportVideo";
import { handleSaveFile, getRecordingMetadata, handleConvertWebmToMp4, handleGetSources, showSourceSelectionDialog } from "./ipcHandlers/recordingHandlers";


// --- existing code below this line stays unchanged ---

// Check if FFmpeg is available
async function checkFFmpegAvailability(): Promise<boolean> {
  return new Promise((resolve) => {
    const ffmpeg = spawn("ffmpeg", ["-version"]);
    ffmpeg.on("close", (code) => {
      resolve(code === 0);
    });
    ffmpeg.on("error", () => {
      resolve(false);
    });
  });
}

// Safely parse frame rate from FFprobe output (e.g., "30/1" or "29.97")
function parseFrameRate(frameRate: string): number {
  if (!frameRate) return 0;
  if (frameRate.includes("/")) {
    const [numerator, denominator] = frameRate.split("/").map(Number);
    return denominator !== 0 ? numerator / denominator : 0;
  }
  return parseFloat(frameRate) || 0;
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));

process.env.APP_ROOT = path.join(__dirname, "..");

export const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
export const MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron");
export const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
  ? path.join(process.env.APP_ROOT, "public")
  : RENDERER_DIST;

let win: BrowserWindow | null;

function createWindow() {
  win = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC, "electron-vite.svg"),
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, "preload.mjs"),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false,
    },
  });

  if (VITE_DEV_SERVER_URL) win.loadURL(VITE_DEV_SERVER_URL);
  else win.loadFile(path.join(RENDERER_DIST, "index.html"));
}

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
    win = null;
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

ipcMain.handle("video.import", async () => {
  try {
    const result = await dialog.showOpenDialog({
      properties: ["openFile"],
      filters: [
        {
          name: "Video Files",
          extensions: ["mp4", "avi", "mov", "mkv", "webm"],
        },
        { name: "All Files", extensions: ["*"] },
      ],
    });

    if (result.canceled || !result.filePaths.length)
      return { success: false, error: "No file selected" };

    const videoPath = result.filePaths[0];
    try {
      const metadata = await getVideoMetadata(videoPath);
      // Convert file path to file:// URL for the renderer process
      const videoUrl = `file://${videoPath}`;
      return { success: true, videoPath: videoUrl, metadata };
    } catch (error) {
      console.error("Failed to extract video metadata:", error);
      // Convert file path to file:// URL for the renderer process
      const videoUrl = `file://${videoPath}`;
      return {
        success: true,
        videoPath: videoUrl,
        metadata: {
          duration: 0,
          width: 0,
          height: 0,
          format: "unknown",
          bitrate: 0,
          fps: 0,
        },
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
});

ipcMain.handle("video.clip", async (_, params) => handleClipVideo(params));
ipcMain.handle("video.export", async (_, params) => handleExportVideo(params));

// Recording handlers
ipcMain.handle("recording.saveFile", async (_, params) => handleSaveFile(params));
ipcMain.handle("recording.getMetadata", async (_, path) => getRecordingMetadata(path));
ipcMain.handle("recording.convertWebmToMp4", async (_, params) => handleConvertWebmToMp4(params));
ipcMain.handle("recording.getSources", async () => handleGetSources());
ipcMain.handle("recording.showSourceDialog", async () => showSourceSelectionDialog());

async function getVideoMetadata(videoPath: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const ffprobe = spawn("ffprobe", [
      "-v",
      "quiet",
      "-print_format",
      "json",
      "-show_format",
      "-show_streams",
      videoPath,
    ]);
    let output = "",
      errOut = "";
    ffprobe.stdout.on("data", (d) => (output += d));
    ffprobe.stderr.on("data", (d) => (errOut += d));
    ffprobe.on("close", (code) => {
      if (code === 0) {
        try {
          const meta = JSON.parse(output);
          const stream = meta.streams.find(
            (s: any) => s.codec_type === "video"
          );
          if (!stream) return reject(new Error("No video stream found"));
          resolve({
            duration: parseFloat(meta.format.duration) || 0,
            width: stream.width || 0,
            height: stream.height || 0,
            format: meta.format.format_name || "unknown",
            bitrate: parseInt(meta.format.bit_rate) || 0,
            fps: parseFrameRate(stream.r_frame_rate) || 0,
          });
        } catch {
          reject(new Error("Failed to parse video metadata"));
        }
      } else reject(new Error(`ffprobe failed with code ${code}: ${errOut}`));
    });
  });
}

app.whenReady().then(async () => {
  const ffmpegAvailable = await checkFFmpegAvailability();
  if (!ffmpegAvailable)
    console.warn(
      "FFmpeg is not available in PATH. Video processing will fail."
    );
  createWindow();
});
