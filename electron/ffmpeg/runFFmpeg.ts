// runFFmpeg.ts
import { spawn, ChildProcess } from "child_process";
import { BrowserWindow } from "electron";
import { FFmpegOptions, FFmpegProgressData, FFmpegResult } from "../types";
import * as fs from "fs";
import * as path from "path";

/** Parse "HH:MM:SS.xx" into seconds. */
function parseHMS(hms: string): number {
  const m = hms.trim().match(/^(\d+):([0-5]?\d):([0-5]?\d(?:\.\d+)?)/);
  if (!m) return 0;
  const [, H, M, S] = m;
  return parseInt(H, 10) * 3600 + parseInt(M, 10) * 60 + parseFloat(S);
}

/** Return the appropriate ffmpeg binary path (bundled or system). */
function getFFmpegPath(): string {
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

/** Spawn ffmpeg with trimming, scaling, and optional playback-speed modification. */
export async function runFFmpeg(options: FFmpegOptions): Promise<FFmpegResult> {
  return new Promise((resolve, reject) => {
    const {
      inputPath,
      outputPath,
      startTime,
      endTime,
      scaleToHeight,
      playbackSpeed,
    } = options;

    const duration = Math.max(0, endTime - startTime);
    if (duration <= 0) {
      return reject(
        new Error("Invalid trim duration (endTime must be > startTime).")
      );
    }

    const adjustedDuration =
      playbackSpeed && playbackSpeed !== 1.0
        ? duration / playbackSpeed
        : duration;

    // --- Build ffmpeg arguments ---
    const args: string[] = [
      "-hide_banner",
      "-nostats",
      "-v",
      "error",
      "-ss",
      startTime.toString(),
      "-t",
      duration.toString(),
      "-i",
      inputPath,
    ];

    // ---- Build filter chains ----
    const videoFilters: string[] = [];
    const audioFilters: string[] = [];

    // Scaling (ensure even width)
    if (scaleToHeight) {
      videoFilters.push(`scale=ceil(iw/2)*2:${scaleToHeight}`);
    }

    // Playback speed (setpts + atempo)
    if (playbackSpeed && playbackSpeed !== 1.0) {
      // Video
      videoFilters.push(`setpts=${(1 / playbackSpeed).toFixed(3)}*PTS`);

      // Audio
      let remainingSpeed = playbackSpeed;
      while (remainingSpeed > 2.0) {
        audioFilters.push("atempo=2.0");
        remainingSpeed /= 2.0;
      }
      while (remainingSpeed < 0.5) {
        audioFilters.push("atempo=0.5");
        remainingSpeed *= 2.0; // correct direction
      }
      if (remainingSpeed !== 1.0) {
        audioFilters.push(`atempo=${remainingSpeed.toFixed(3)}`);
      }
    }

    // ---- Apply filters ----
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
      playbackSpeed && playbackSpeed !== 1.0
    );

    const ffmpeg: ChildProcess = spawn(ffmpegPath, args, {
      stdio: ["ignore", "pipe", "pipe"],
    });
    const mainWindow = BrowserWindow.getAllWindows()[0];

    // --- Progress tracking ---
    let rawOutTime = 0;
    let relTime = 0;
    let lastPct = -1;
    let startedAt = Date.now();
    let speedEWMA = 0;
    const alpha = 0.3;
    let stderrBuffer = "";

    ffmpeg.stdout?.setEncoding("utf8");
    ffmpeg.stdout?.on("data", (chunk: string) => {
      for (const line of chunk.split(/\r?\n/)) {
        if (!line.includes("=")) continue;
        const [key, valRaw] = line.split("=", 2);
        const val = (valRaw ?? "").trim();

        if (key === "out_time_us") {
          const us = parseInt(val, 10);
          if (!Number.isNaN(us)) rawOutTime = us / 1_000_000;
        } else if (key === "out_time_ms") {
          const ms = parseInt(val, 10);
          if (!Number.isNaN(ms)) rawOutTime = ms / 1_000;
        } else if (key === "out_time") {
          rawOutTime = Math.max(rawOutTime, parseHMS(val));
        }
      }

      const candidateRel = Math.max(0, rawOutTime - startTime);
      relTime = Math.min(duration, Math.max(relTime, candidateRel));

      const elapsed = Math.max(0.001, (Date.now() - startedAt) / 1000);
      const throughput = relTime / elapsed;
      speedEWMA =
        speedEWMA === 0
          ? throughput
          : alpha * throughput + (1 - alpha) * speedEWMA;

      const pct = Math.max(0, Math.min(100, (relTime / duration) * 100));
      const remaining = Math.max(0, duration - relTime);
      const speedForEta = Math.max(0.2, Math.min(speedEWMA, 6));
      const eta = Math.round(remaining / (speedForEta || 0.2));

      if (mainWindow && (pct - lastPct >= 1 || pct === 100)) {
        lastPct = pct;
        const progressData: FFmpegProgressData & {
          time?: number;
          speed?: number;
          eta?: number;
        } = {
          progress: Math.round(pct),
          time: relTime,
          speed: Number(speedEWMA.toFixed(2)),
          eta,
        };
        mainWindow.webContents.send("ffmpeg.progress", progressData);
      }
    });

    ffmpeg.stderr?.setEncoding("utf8");
    ffmpeg.stderr?.on("data", (data: string) => {
      stderrBuffer += data;
      console.log("[ffmpeg]", data.trim());
    });

    ffmpeg.on("close", (code: number) => {
      if (code === 0) {
        if (mainWindow) {
          const finalProgress: FFmpegProgressData & {
            time?: number;
            speed?: number;
            eta?: number;
          } = {
            progress: 100,
            time: adjustedDuration,
            speed: Number(speedEWMA.toFixed(2)) || 1,
            eta: 0,
          };
          mainWindow.webContents.send("ffmpeg.progress", finalProgress);
        }
        resolve({ success: true, outputPath });
      } else {
        reject(
          new Error(
            `FFmpeg exited with code ${code}\n${
              stderrBuffer || "No additional error info"
            }`
          )
        );
      }
    });

    ffmpeg.on("error", (error: Error) => {
      reject(new Error(`Failed to start FFmpeg: ${error.message}`));
    });
  });
}
