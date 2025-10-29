import { BrowserWindow as k, dialog as q, app as x, ipcMain as M } from "electron";
import { fileURLToPath as te } from "node:url";
import d from "node:path";
import { spawn as R } from "child_process";
import * as oe from "fs";
import { statSync as L } from "fs";
import * as re from "path";
import I from "path";
function ne(t) {
  const e = t.trim().match(/^(\d+):([0-5]?\d):([0-5]?\d(?:\.\d+)?)/);
  if (!e) return 0;
  const [, o, s, c] = e;
  return parseInt(o, 10) * 3600 + parseInt(s, 10) * 60 + parseFloat(c);
}
function se() {
  const t = process.platform === "win32" ? "win" : "linux", e = process.platform === "win32" ? "ffmpeg.exe" : "ffmpeg", o = re.join(
    process.resourcesPath,
    "bin",
    t,
    e
  );
  return oe.existsSync(o) ? (console.log("Using bundled FFmpeg:", o), o) : (console.log("Using system FFmpeg from PATH"), "ffmpeg");
}
async function ie(t) {
  return new Promise((e, o) => {
    var C, U, $, H;
    const {
      inputPath: s,
      outputPath: c,
      startTime: p,
      endTime: i,
      scaleToHeight: a,
      playbackSpeed: r
    } = t, l = Math.max(0, i - p);
    if (l <= 0)
      return o(
        new Error("Invalid trim duration (endTime must be > startTime).")
      );
    const A = r && r !== 1 ? l / r : l, m = [
      "-hide_banner",
      "-nostats",
      "-v",
      "error",
      "-ss",
      p.toString(),
      "-t",
      l.toString(),
      "-i",
      s
    ], w = [], u = [];
    if (a && w.push(`scale=ceil(iw/2)*2:${a}`), r && r !== 1) {
      w.push(`setpts=${(1 / r).toFixed(3)}*PTS`);
      let n = r;
      for (; n > 2; )
        u.push("atempo=2.0"), n /= 2;
      for (; n < 0.5; )
        u.push("atempo=0.5"), n *= 2;
      n !== 1 && u.push(`atempo=${n.toFixed(3)}`);
    }
    w.length > 0 ? m.push(
      "-vf",
      w.join(","),
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p"
    ) : m.push("-c:v", "copy"), u.length > 0 ? m.push("-af", u.join(",")) : m.push("-c:a", "copy"), m.push("-progress", "pipe:1", "-nostdin", "-y", c);
    const N = se();
    console.log("Running FFmpeg command:", [N, ...m].join(" ")), console.log(
      "Playback speed:",
      r,
      "type:",
      typeof r
    ), console.log("Video filters:", w), console.log("Audio filters:", u), console.log(
      "Speed condition check:",
      r && r !== 1
    );
    const f = R(N, m, {
      stdio: ["ignore", "pipe", "pipe"]
    }), b = k.getAllWindows()[0];
    let v = 0, h = 0, D = -1, K = Date.now(), g = 0;
    const O = 0.3;
    let j = "";
    (C = f.stdout) == null || C.setEncoding("utf8"), (U = f.stdout) == null || U.on("data", (n) => {
      for (const F of n.split(/\r?\n/)) {
        if (!F.includes("=")) continue;
        const [T, ee] = F.split("=", 2), S = (ee ?? "").trim();
        if (T === "out_time_us") {
          const y = parseInt(S, 10);
          Number.isNaN(y) || (v = y / 1e6);
        } else if (T === "out_time_ms") {
          const y = parseInt(S, 10);
          Number.isNaN(y) || (v = y / 1e3);
        } else T === "out_time" && (v = Math.max(v, ne(S)));
      }
      const E = Math.max(0, v - p);
      h = Math.min(l, Math.max(h, E));
      const Q = Math.max(1e-3, (Date.now() - K) / 1e3), W = h / Q;
      g = g === 0 ? W : O * W + (1 - O) * g;
      const P = Math.max(0, Math.min(100, h / l * 100)), X = Math.max(0, l - h), Y = Math.max(0.2, Math.min(g, 6)), Z = Math.round(X / (Y || 0.2));
      if (b && (P - D >= 1 || P === 100)) {
        D = P;
        const F = {
          progress: Math.round(P),
          time: h,
          speed: Number(g.toFixed(2)),
          eta: Z
        };
        b.webContents.send("ffmpeg.progress", F);
      }
    }), ($ = f.stderr) == null || $.setEncoding("utf8"), (H = f.stderr) == null || H.on("data", (n) => {
      j += n, console.log("[ffmpeg]", n.trim());
    }), f.on("close", (n) => {
      if (n === 0) {
        if (b) {
          const E = {
            progress: 100,
            time: A,
            speed: Number(g.toFixed(2)) || 1,
            eta: 0
          };
          b.webContents.send("ffmpeg.progress", E);
        }
        e({ success: !0, outputPath: c });
      } else
        o(
          new Error(
            `FFmpeg exited with code ${n}
${j || "No additional error info"}`
          )
        );
    }), f.on("error", (n) => {
      o(new Error(`Failed to start FFmpeg: ${n.message}`));
    });
  });
}
async function B(t) {
  try {
    console.log("Clipping video with params:", t), console.log("ClipVideo - playbackSpeed:", t.playbackSpeed);
    const {
      inputPath: e,
      outputPath: o,
      startTime: s,
      endTime: c,
      scaleToHeight: p,
      playbackSpeed: i
    } = t;
    if (!e || !o)
      return {
        success: !1,
        error: "Input and output paths are required"
      };
    if (s < 0 || c <= s)
      return {
        success: !1,
        error: "Invalid time range: start time must be >= 0 and end time must be > start time"
      };
    const a = await ie({
      inputPath: e,
      outputPath: o,
      startTime: s,
      endTime: c,
      scaleToHeight: p,
      playbackSpeed: i
    });
    return console.log("Video clipping completed:", a), a;
  } catch (e) {
    return console.error("Error clipping video:", e), {
      success: !1,
      error: e instanceof Error ? e.message : "Unknown error occurred while clipping video"
    };
  }
}
async function ae(t) {
  try {
    console.log("Exporting video with params:", t), console.log("ExportVideo - playbackSpeed:", t.playbackSpeed);
    const { inputPath: e, startTime: o, endTime: s, scaleToHeight: c, playbackSpeed: p } = t;
    if (!e)
      return {
        success: !1,
        error: "Input path is required"
      };
    if (o < 0 || s <= o)
      return {
        success: !1,
        error: "Invalid time range: start time must be >= 0 and end time must be > start time"
      };
    const i = await q.showSaveDialog({
      title: "Save Trimmed Video",
      defaultPath: ce(e),
      filters: [
        {
          name: "Video Files",
          extensions: ["mp4", "avi", "mov", "mkv", "webm"]
        },
        { name: "All Files", extensions: ["*"] }
      ]
    });
    if (i.canceled || !i.filePath)
      return {
        success: !1,
        cancelled: !0
      };
    const a = i.filePath;
    try {
      L(e);
    } catch {
      return {
        success: !1,
        error: "Input video file not found. Please re-import the video."
      };
    }
    try {
      const l = I.dirname(a);
      if (!L(l).isDirectory())
        return {
          success: !1,
          error: "Output directory is not valid"
        };
    } catch {
      return {
        success: !1,
        error: "Cannot access output directory. Please check permissions."
      };
    }
    console.log("Calling handleClipVideo with params:", {
      inputPath: e,
      outputPath: a,
      startTime: o,
      endTime: s,
      scaleToHeight: c,
      playbackSpeed: p
    });
    const r = await B({
      inputPath: e,
      outputPath: a,
      startTime: o,
      endTime: s,
      scaleToHeight: c,
      playbackSpeed: p
    });
    return console.log("handleClipVideo returned:", r), r;
  } catch (e) {
    return console.error("Error exporting video:", e), {
      success: !1,
      error: e instanceof Error ? e.message : "Unknown error occurred while exporting video"
    };
  }
}
function ce(t) {
  const e = I.parse(t), o = (/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-").slice(0, 19);
  return I.join(
    e.dir,
    `${e.name}_trimmed_${o}.mp4`
  );
}
async function le() {
  return new Promise((t) => {
    const e = R("ffmpeg", ["-version"]);
    e.on("close", (o) => {
      t(o === 0);
    }), e.on("error", () => {
      t(!1);
    });
  });
}
function pe(t) {
  if (!t) return 0;
  if (t.includes("/")) {
    const [e, o] = t.split("/").map(Number);
    return o !== 0 ? e / o : 0;
  }
  return parseFloat(t) || 0;
}
const J = d.dirname(te(import.meta.url));
process.env.APP_ROOT = d.join(J, "..");
const V = process.env.VITE_DEV_SERVER_URL, ve = d.join(process.env.APP_ROOT, "dist-electron"), z = d.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = V ? d.join(process.env.APP_ROOT, "public") : z;
let _;
function G() {
  _ = new k({
    icon: d.join(process.env.VITE_PUBLIC, "electron-vite.svg"),
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: d.join(J, "preload.mjs"),
      contextIsolation: !0,
      nodeIntegration: !1,
      webSecurity: !1
    }
  }), V ? _.loadURL(V) : _.loadFile(d.join(z, "index.html"));
}
x.on("window-all-closed", () => {
  process.platform !== "darwin" && (x.quit(), _ = null);
});
x.on("activate", () => {
  k.getAllWindows().length === 0 && G();
});
M.handle("video.import", async () => {
  try {
    const t = await q.showOpenDialog({
      properties: ["openFile"],
      filters: [
        {
          name: "Video Files",
          extensions: ["mp4", "avi", "mov", "mkv", "webm"]
        },
        { name: "All Files", extensions: ["*"] }
      ]
    });
    if (t.canceled || !t.filePaths.length)
      return { success: !1, error: "No file selected" };
    const e = t.filePaths[0];
    try {
      const o = await de(e);
      return { success: !0, videoPath: e, metadata: o };
    } catch (o) {
      return console.error("Failed to extract video metadata:", o), {
        success: !0,
        videoPath: e,
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
  } catch (t) {
    return {
      success: !1,
      error: t instanceof Error ? t.message : "Unknown error"
    };
  }
});
M.handle("video.clip", async (t, e) => B(e));
M.handle("video.export", async (t, e) => ae(e));
async function de(t) {
  return new Promise((e, o) => {
    const s = R("ffprobe", [
      "-v",
      "quiet",
      "-print_format",
      "json",
      "-show_format",
      "-show_streams",
      t
    ]);
    let c = "", p = "";
    s.stdout.on("data", (i) => c += i), s.stderr.on("data", (i) => p += i), s.on("close", (i) => {
      if (i === 0)
        try {
          const a = JSON.parse(c), r = a.streams.find(
            (l) => l.codec_type === "video"
          );
          if (!r) return o(new Error("No video stream found"));
          e({
            duration: parseFloat(a.format.duration) || 0,
            width: r.width || 0,
            height: r.height || 0,
            format: a.format.format_name || "unknown",
            bitrate: parseInt(a.format.bit_rate) || 0,
            fps: pe(r.r_frame_rate) || 0
          });
        } catch {
          o(new Error("Failed to parse video metadata"));
        }
      else o(new Error(`ffprobe failed with code ${i}: ${p}`));
    });
  });
}
x.whenReady().then(async () => {
  await le() || console.warn(
    "FFmpeg is not available in PATH. Video processing will fail."
  ), G();
});
export {
  ve as MAIN_DIST,
  z as RENDERER_DIST,
  V as VITE_DEV_SERVER_URL
};
