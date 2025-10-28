// runFFmpeg.ts
import { spawn, ChildProcess } from "child_process";
import { BrowserWindow } from "electron";
import { FFmpegOptions, FFmpegProgressData, FFmpegResult } from "../types";

function parseHMS(hms: string): number {
  const m = hms.trim().match(/^(\d+):([0-5]?\d):([0-5]?\d(?:\.\d+)?)/);
  if (!m) return 0;
  const [, H, M, S] = m;
  return parseInt(H, 10) * 3600 + parseInt(M, 10) * 60 + parseFloat(S);
}

export async function runFFmpeg(options: FFmpegOptions): Promise<FFmpegResult> {
  return new Promise((resolve, reject) => {
    const { inputPath, outputPath, startTime, endTime, scaleToHeight } =
      options;

    const duration = Math.max(0, endTime - startTime);
    if (duration <= 0) {
      return reject(
        new Error("Invalid trim duration (endTime must be > startTime).")
      );
    }

    // --- Build FFmpeg args ---
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

    if (scaleToHeight) {
      // Scale to specific height while maintaining aspect ratio
      const scaleExpr = `scale=ceil(iw/2)*2:${scaleToHeight}`;
      args.push(
        "-vf",
        scaleExpr,
        "-c:v",
        "libx264",
        "-pix_fmt",
        "yuv420p",
        "-c:a",
        "copy"
      );
    } else {
      args.push("-c", "copy");
    }

    args.push("-progress", "pipe:1", "-nostdin", "-y", outputPath);

    console.log("Running FFmpeg command:", ["ffmpeg", ...args].join(" "));

    const ffmpeg: ChildProcess = spawn("ffmpeg", args, {
      stdio: ["ignore", "pipe", "pipe"],
    });
    const mainWindow = BrowserWindow.getAllWindows()[0];

    // --- Track progress ---
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
      const speedForEta = Math.max(
        0.2,
        Math.min(speedEWMA, scaleToHeight ? 6 : 5)
      );
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
            time: duration,
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
