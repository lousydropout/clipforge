import { app, BrowserWindow, ipcMain, dialog } from "electron";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { spawn } from "child_process";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
process.env.APP_ROOT = path.join(__dirname, "..");
const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
const MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron");
const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, "public") : RENDERER_DIST;
let win;
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
      webSecurity: false
      // Allow local file access
    }
  });
  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(RENDERER_DIST, "index.html"));
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
  console.log("Mock video.clip called with params:", params);
  return {
    success: true,
    outputPath: "/mock/output/path.mp4"
  };
});
ipcMain.handle("video.export", async (_, params) => {
  console.log("Mock video.export called with params:", params);
  const mainWindow = BrowserWindow.getAllWindows()[0];
  if (mainWindow) {
    for (let i = 0; i <= 100; i += 10) {
      setTimeout(() => {
        mainWindow.webContents.send("ffmpeg.progress", {
          progress: i,
          time: i / 100 * (params.endTime - params.startTime),
          speed: 1,
          eta: (100 - i) / 10 * 2
          // 2 seconds per 10%
        });
      }, i * 100);
    }
  }
  return new Promise((resolve2) => {
    setTimeout(() => {
      resolve2({
        success: true,
        outputPath: "/mock/exported/video.mp4"
      });
    }, 2e3);
  });
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
