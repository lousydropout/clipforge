import { BrowserWindow, dialog, desktopCapturer, app, ipcMain } from "electron";
import { fileURLToPath } from "node:url";
import path$1 from "node:path";
import { spawn } from "child_process";
import * as fs from "fs";
import { statSync } from "fs";
import * as path from "path";
import path__default, { join } from "path";
import { mkdir, writeFile } from "fs/promises";
import { tmpdir } from "os";
function parseHMS(hms) {
  const m = hms.trim().match(/^(\d+):([0-5]?\d):([0-5]?\d(?:\.\d+)?)/);
  if (!m) return 0;
  const [, H, M, S] = m;
  return parseInt(H, 10) * 3600 + parseInt(M, 10) * 60 + parseFloat(S);
}
function getFFmpegPath() {
  const platform = process.platform === "win32" ? "win" : "linux";
  const execName = process.platform === "win32" ? "ffmpeg.exe" : "ffmpeg";
  const bundledPath = path.join(
    process.resourcesPath,
    "bin",
    platform,
    execName
  );
  if (fs.existsSync(bundledPath)) {
    console.log("Using bundled FFmpeg:", bundledPath);
    return bundledPath;
  }
  console.log("Using system FFmpeg from PATH");
  return "ffmpeg";
}
async function runFFmpeg(options) {
  return new Promise((resolve, reject) => {
    var _a, _b, _c, _d;
    const {
      inputPath,
      outputPath,
      startTime,
      endTime,
      scaleToHeight,
      playbackSpeed
    } = options;
    const duration = Math.max(0, endTime - startTime);
    if (duration <= 0) {
      return reject(
        new Error("Invalid trim duration (endTime must be > startTime).")
      );
    }
    const adjustedDuration = playbackSpeed && playbackSpeed !== 1 ? duration / playbackSpeed : duration;
    const args = [
      "-hide_banner",
      "-nostats",
      "-v",
      "error",
      "-ss",
      startTime.toString(),
      "-t",
      duration.toString(),
      "-i",
      inputPath
    ];
    const videoFilters = [];
    const audioFilters = [];
    if (scaleToHeight) {
      videoFilters.push(`scale=ceil(iw/2)*2:${scaleToHeight}`);
    }
    if (playbackSpeed && playbackSpeed !== 1) {
      videoFilters.push(`setpts=${(1 / playbackSpeed).toFixed(3)}*PTS`);
      let remainingSpeed = playbackSpeed;
      while (remainingSpeed > 2) {
        audioFilters.push("atempo=2.0");
        remainingSpeed /= 2;
      }
      while (remainingSpeed < 0.5) {
        audioFilters.push("atempo=0.5");
        remainingSpeed *= 2;
      }
      if (remainingSpeed !== 1) {
        audioFilters.push(`atempo=${remainingSpeed.toFixed(3)}`);
      }
    }
    if (videoFilters.length > 0) {
      args.push(
        "-vf",
        videoFilters.join(","),
        "-c:v",
        "libx264",
        "-pix_fmt",
        "yuv420p"
      );
    } else {
      args.push("-c:v", "copy");
    }
    if (audioFilters.length > 0) {
      args.push("-af", audioFilters.join(","));
    } else {
      args.push("-c:a", "copy");
    }
    args.push("-progress", "pipe:1", "-nostdin", "-y", outputPath);
    const ffmpegPath = getFFmpegPath();
    console.log("Running FFmpeg command:", [ffmpegPath, ...args].join(" "));
    console.log(
      "Playback speed:",
      playbackSpeed,
      "type:",
      typeof playbackSpeed
    );
    console.log("Video filters:", videoFilters);
    console.log("Audio filters:", audioFilters);
    console.log(
      "Speed condition check:",
      playbackSpeed && playbackSpeed !== 1
    );
    const ffmpeg = spawn(ffmpegPath, args, {
      stdio: ["ignore", "pipe", "pipe"]
    });
    const mainWindow = BrowserWindow.getAllWindows()[0];
    let rawOutTime = 0;
    let relTime = 0;
    let lastPct = -1;
    let startedAt = Date.now();
    let speedEWMA = 0;
    const alpha = 0.3;
    let stderrBuffer = "";
    (_a = ffmpeg.stdout) == null ? void 0 : _a.setEncoding("utf8");
    (_b = ffmpeg.stdout) == null ? void 0 : _b.on("data", (chunk) => {
      for (const line of chunk.split(/\r?\n/)) {
        if (!line.includes("=")) continue;
        const [key, valRaw] = line.split("=", 2);
        const val = (valRaw ?? "").trim();
        if (key === "out_time_us") {
          const us = parseInt(val, 10);
          if (!Number.isNaN(us)) rawOutTime = us / 1e6;
        } else if (key === "out_time_ms") {
          const ms = parseInt(val, 10);
          if (!Number.isNaN(ms)) rawOutTime = ms / 1e3;
        } else if (key === "out_time") {
          rawOutTime = Math.max(rawOutTime, parseHMS(val));
        }
      }
      const candidateRel = Math.max(0, rawOutTime - startTime);
      relTime = Math.min(duration, Math.max(relTime, candidateRel));
      const elapsed = Math.max(1e-3, (Date.now() - startedAt) / 1e3);
      const throughput = relTime / elapsed;
      speedEWMA = speedEWMA === 0 ? throughput : alpha * throughput + (1 - alpha) * speedEWMA;
      const pct = Math.max(0, Math.min(100, relTime / duration * 100));
      const remaining = Math.max(0, duration - relTime);
      const speedForEta = Math.max(0.2, Math.min(speedEWMA, 6));
      const eta = Math.round(remaining / (speedForEta || 0.2));
      if (mainWindow && (pct - lastPct >= 1 || pct === 100)) {
        lastPct = pct;
        const progressData = {
          progress: Math.round(pct),
          time: relTime,
          speed: Number(speedEWMA.toFixed(2)),
          eta
        };
        mainWindow.webContents.send("ffmpeg.progress", progressData);
      }
    });
    (_c = ffmpeg.stderr) == null ? void 0 : _c.setEncoding("utf8");
    (_d = ffmpeg.stderr) == null ? void 0 : _d.on("data", (data) => {
      stderrBuffer += data;
      console.log("[ffmpeg]", data.trim());
    });
    ffmpeg.on("close", (code) => {
      if (code === 0) {
        if (mainWindow) {
          const finalProgress = {
            progress: 100,
            time: adjustedDuration,
            speed: Number(speedEWMA.toFixed(2)) || 1,
            eta: 0
          };
          mainWindow.webContents.send("ffmpeg.progress", finalProgress);
        }
        resolve({ success: true, outputPath });
      } else {
        reject(
          new Error(
            `FFmpeg exited with code ${code}
${stderrBuffer || "No additional error info"}`
          )
        );
      }
    });
    ffmpeg.on("error", (error) => {
      reject(new Error(`Failed to start FFmpeg: ${error.message}`));
    });
  });
}
async function handleClipVideo(params) {
  try {
    console.log("Clipping video with params:", params);
    console.log("ClipVideo - playbackSpeed:", params.playbackSpeed);
    const {
      inputPath,
      outputPath,
      startTime,
      endTime,
      scaleToHeight,
      playbackSpeed
    } = params;
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
      scaleToHeight,
      playbackSpeed
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
    console.log("ExportVideo - playbackSpeed:", params.playbackSpeed);
    const { inputPath, startTime, endTime, scaleToHeight, playbackSpeed } = params;
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
        cancelled: true
      };
    }
    const outputPath = result.filePath;
    try {
      statSync(inputPath);
    } catch (error) {
      return {
        success: false,
        error: "Input video file not found. Please re-import the video."
      };
    }
    try {
      const outputDir = path__default.dirname(outputPath);
      const stats = statSync(outputDir);
      if (!stats.isDirectory()) {
        return {
          success: false,
          error: "Output directory is not valid"
        };
      }
    } catch (error) {
      return {
        success: false,
        error: "Cannot access output directory. Please check permissions."
      };
    }
    console.log("Calling handleClipVideo with params:", {
      inputPath,
      outputPath,
      startTime,
      endTime,
      scaleToHeight,
      playbackSpeed
    });
    const clipResult = await handleClipVideo({
      inputPath,
      outputPath,
      startTime,
      endTime,
      scaleToHeight,
      playbackSpeed
    });
    console.log("handleClipVideo returned:", clipResult);
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
  const parsedPath = path__default.parse(inputPath);
  const timestamp = (/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-").slice(0, 19);
  return path__default.join(
    parsedPath.dir,
    `${parsedPath.name}_trimmed_${timestamp}.mp4`
  );
}
async function handleSaveFile(params) {
  try {
    const { buffer, filename } = params;
    const tempDir = join(tmpdir(), "clipforge-recordings");
    await mkdir(tempDir, { recursive: true });
    const timestamp = Date.now();
    const name = filename.replace(/\.webm$/, `_${timestamp}.webm`);
    const filePath = join(tempDir, name);
    const bufferData = Buffer.from(buffer);
    await writeFile(filePath, bufferData);
    console.log("Recording saved to:", filePath);
    return {
      success: true,
      filePath
    };
  } catch (error) {
    console.error("Failed to save recording:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to save recording file"
    };
  }
}
async function getRecordingMetadata(filePath) {
  return new Promise((resolve) => {
    console.log("Extracting metadata for:", filePath);
    const ffprobe = spawn("ffprobe", [
      "-v",
      "quiet",
      "-print_format",
      "json",
      "-show_format",
      "-show_streams",
      filePath
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
            (stream) => stream.codec_type === "video"
          );
          if (!videoStream) {
            console.warn("No video stream found, using fallback metadata");
            const result2 = {
              duration: parseFloat(metadata.format.duration) || 10,
              // Default 10 seconds
              width: 1920,
              // Default HD width
              height: 1080,
              // Default HD height
              format: "webm",
              bitrate: 0,
              fps: 30
              // Default 30 fps
            };
            console.log("Using fallback metadata:", result2);
            resolve(result2);
            return;
          }
          const parseFrameRate2 = (frameRate) => {
            if (!frameRate) return 30;
            if (frameRate.includes("/")) {
              const [numerator, denominator] = frameRate.split("/").map(Number);
              return denominator !== 0 ? numerator / denominator : 30;
            }
            return parseFloat(frameRate) || 30;
          };
          const result = {
            duration: parseFloat(metadata.format.duration) || 10,
            width: videoStream.width || 1920,
            height: videoStream.height || 1080,
            format: metadata.format.format_name || "webm",
            bitrate: parseInt(metadata.format.bit_rate) || 0,
            fps: parseFrameRate2(videoStream.r_frame_rate)
          };
          console.log("Recording metadata extracted:", result);
          resolve(result);
        } catch (parseError) {
          console.error("Failed to parse recording metadata:", parseError);
          console.log("Raw output:", output);
          console.log("Error output:", errOut);
          const result = {
            duration: 10,
            width: 1920,
            height: 1080,
            format: "webm",
            bitrate: 0,
            fps: 30
          };
          console.log("Using fallback metadata due to parse error:", result);
          resolve(result);
        }
      } else {
        console.error(`FFprobe failed with code ${code}:`, errOut);
        console.log("Raw output:", output);
        const result = {
          duration: 10,
          width: 1920,
          height: 1080,
          format: "webm",
          bitrate: 0,
          fps: 30
        };
        console.log("Using fallback metadata due to FFprobe failure:", result);
        resolve(result);
      }
    });
    ffprobe.on("error", (error) => {
      console.error("FFprobe process error:", error);
      const result = {
        duration: 10,
        width: 1920,
        height: 1080,
        format: "webm",
        bitrate: 0,
        fps: 30
      };
      console.log("Using fallback metadata due to process error:", result);
      resolve(result);
    });
  });
}
async function handleConvertWebmToMp4(params) {
  try {
    const { webmPath, mp4Filename } = params;
    const tempDir = join(tmpdir(), "clipforge-recordings");
    await mkdir(tempDir, { recursive: true });
    const mp4Path = join(tempDir, mp4Filename);
    const ffmpeg = spawn("ffmpeg", [
      "-i",
      webmPath,
      "-c:v",
      "libx264",
      "-c:a",
      "aac",
      "-preset",
      "ultrafast",
      // Much faster encoding
      "-crf",
      "28",
      // Slightly lower quality but much faster
      "-movflags",
      "+faststart",
      // Optimize for web playback
      "-y",
      // Overwrite output file
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
async function handleGetSources() {
  try {
    const sources = await desktopCapturer.getSources({
      types: ["screen", "window"],
      thumbnailSize: { width: 150, height: 150 }
    });
    return sources.map((source) => ({
      id: source.id,
      name: source.name,
      thumbnail: source.thumbnail.toDataURL()
    }));
  } catch (error) {
    console.error("Failed to get screen sources:", error);
    throw new Error("Failed to get screen sources");
  }
}
async function showSourceSelectionDialog() {
  try {
    const sources = await desktopCapturer.getSources({
      types: ["screen", "window"],
      thumbnailSize: { width: 150, height: 150 }
    });
    if (sources.length === 0) {
      throw new Error("No screen sources available");
    }
    if (sources.length === 1) {
      return sources[0].id;
    }
    const choice = await dialog.showMessageBox({
      type: "question",
      buttons: sources.map((source) => source.name),
      defaultId: 0,
      title: "Select Screen Source",
      message: "Choose which screen or window to record:",
      detail: "Select the source you want to record from the list below."
    });
    if (choice.response >= 0 && choice.response < sources.length) {
      return sources[choice.response].id;
    }
    return null;
  } catch (error) {
    console.error("Failed to show source selection dialog:", error);
    throw new Error("Failed to show source selection dialog");
  }
}
async function checkFFmpegAvailability() {
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
function parseFrameRate(frameRate) {
  if (!frameRate) return 0;
  if (frameRate.includes("/")) {
    const [numerator, denominator] = frameRate.split("/").map(Number);
    return denominator !== 0 ? numerator / denominator : 0;
  }
  return parseFloat(frameRate) || 0;
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
    }
  });
  if (VITE_DEV_SERVER_URL) win.loadURL(VITE_DEV_SERVER_URL);
  else win.loadFile(path$1.join(RENDERER_DIST, "index.html"));
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
          extensions: ["mp4", "avi", "mov", "mkv", "webm"]
        },
        { name: "All Files", extensions: ["*"] }
      ]
    });
    if (result.canceled || !result.filePaths.length)
      return { success: false, error: "No file selected" };
    const videoPath = result.filePaths[0];
    try {
      const metadata = await getVideoMetadata(videoPath);
      const videoUrl = `file://${videoPath}`;
      return { success: true, videoPath: videoUrl, metadata };
    } catch (error) {
      console.error("Failed to extract video metadata:", error);
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
          fps: 0
        }
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
});
ipcMain.handle("video.clip", async (_, params) => handleClipVideo(params));
ipcMain.handle("video.export", async (_, params) => handleExportVideo(params));
ipcMain.handle("recording.saveFile", async (_, params) => handleSaveFile(params));
ipcMain.handle("recording.getMetadata", async (_, path2) => getRecordingMetadata(path2));
ipcMain.handle("recording.convertWebmToMp4", async (_, params) => handleConvertWebmToMp4(params));
ipcMain.handle("recording.getSources", async () => handleGetSources());
ipcMain.handle("recording.showSourceDialog", async () => showSourceSelectionDialog());
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
    let output = "", errOut = "";
    ffprobe.stdout.on("data", (d) => output += d);
    ffprobe.stderr.on("data", (d) => errOut += d);
    ffprobe.on("close", (code) => {
      if (code === 0) {
        try {
          const meta = JSON.parse(output);
          const stream = meta.streams.find(
            (s) => s.codec_type === "video"
          );
          if (!stream) return reject(new Error("No video stream found"));
          resolve({
            duration: parseFloat(meta.format.duration) || 0,
            width: stream.width || 0,
            height: stream.height || 0,
            format: meta.format.format_name || "unknown",
            bitrate: parseInt(meta.format.bit_rate) || 0,
            fps: parseFrameRate(stream.r_frame_rate) || 0
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
export {
  MAIN_DIST,
  RENDERER_DIST,
  VITE_DEV_SERVER_URL
};
