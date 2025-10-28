import { app, BrowserWindow, ipcMain, dialog } from "electron";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { spawn } from "child_process";
import { handleClipVideo } from "./ipcHandlers/clipVideo";
import { handleExportVideo } from "./ipcHandlers/exportVideo";
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// The built directory structure
//
// ├─┬─┬ dist
// │ │ └── index.html
// │ │
// │ ├─┬ dist-electron
// │ │ ├── main.js
// │ │ └── preload.mjs
// │
process.env.APP_ROOT = path.join(__dirname, "..");

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
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
      webSecurity: false, // Allow local file access
    },
  });

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    // win.loadFile('dist/index.html')
    win.loadFile(path.join(RENDERER_DIST, "index.html"));
  }
}

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
    win = null;
  }
});

app.on("activate", () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// IPC Handlers (Mock implementations for Epic 2 testing)
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

    if (result.canceled || !result.filePaths.length) {
      return { success: false, error: "No file selected" };
    }

    const videoPath = result.filePaths[0];

    try {
      // Get real video metadata using ffprobe
      const metadata = await getVideoMetadata(videoPath);
      console.log("Video metadata extracted:", metadata);

      return {
        success: true,
        videoPath,
        metadata,
      };
    } catch (error) {
      console.error("Failed to extract video metadata:", error);
      // Fallback to basic metadata if ffprobe fails
      return {
        success: true,
        videoPath,
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
    console.error("Error importing video:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
});

ipcMain.handle("video.clip", async (_, params) => {
  return handleClipVideo(params);
});

ipcMain.handle("video.export", async (_, params) => {
  return handleExportVideo(params);
});

// Helper function to get video metadata using ffprobe
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
            (stream: any) => stream.codec_type === "video"
          );

          if (videoStream) {
            resolve({
              duration: parseFloat(metadata.format.duration) || 0,
              width: videoStream.width || 0,
              height: videoStream.height || 0,
              format: metadata.format.format_name || "unknown",
              bitrate: parseInt(metadata.format.bit_rate) || 0,
              fps: eval(videoStream.r_frame_rate) || 0,
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
