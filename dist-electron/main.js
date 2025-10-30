import { BrowserWindow as es, dialog as _t, desktopCapturer as sn, app as Le, ipcMain as j } from "electron";
import { fileURLToPath as Jr } from "node:url";
import ae from "node:path";
import { spawn as ie } from "child_process";
import * as Vr from "fs";
import { statSync as Cs, createReadStream as Xr } from "fs";
import * as Kr from "path";
import Dt, { join as de } from "path";
import { mkdir as ts, writeFile as Gr, unlink as Qr } from "fs/promises";
import { tmpdir as ss } from "os";
function zr(n) {
  const e = n.trim().match(/^(\d+):([0-5]?\d):([0-5]?\d(?:\.\d+)?)/);
  if (!e) return 0;
  const [, t, s, r] = e;
  return parseInt(t, 10) * 3600 + parseInt(s, 10) * 60 + parseFloat(r);
}
function Yr() {
  const n = process.platform === "win32" ? "win" : "linux", e = process.platform === "win32" ? "ffmpeg.exe" : "ffmpeg", t = Kr.join(
    process.resourcesPath,
    "bin",
    n,
    e
  );
  return Vr.existsSync(t) ? (console.log("Using bundled FFmpeg:", t), t) : (console.log("Using system FFmpeg from PATH"), "ffmpeg");
}
async function Zr(n) {
  return new Promise((e, t) => {
    var E, O, I, ee;
    const {
      inputPath: s,
      outputPath: r,
      startTime: a,
      endTime: i,
      scaleToHeight: o,
      scaleFactor: c,
      playbackSpeed: l
    } = n, h = Math.max(0, i - a);
    if (h <= 0)
      return t(
        new Error("Invalid trim duration (endTime must be > startTime).")
      );
    const d = l && l !== 1 ? h / l : h, p = [
      "-hide_banner",
      "-nostats",
      "-v",
      "error",
      "-ss",
      a.toString(),
      "-t",
      h.toString(),
      "-i",
      s
    ], m = [], g = [];
    if (c && c < 1 ? m.push(`scale=trunc(iw*${c}/2)*2:trunc(ih*${c}/2)*2`) : o && m.push(`scale=ceil(iw/2)*2:${o}`), l && l !== 1) {
      m.push(`setpts=${(1 / l).toFixed(3)}*PTS`);
      let T = l;
      for (; T > 2; )
        g.push("atempo=2.0"), T /= 2;
      for (; T < 0.5; )
        g.push("atempo=0.5"), T *= 2;
      T !== 1 && g.push(`atempo=${T.toFixed(3)}`);
    }
    m.length > 0 ? p.push(
      "-vf",
      m.join(","),
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p"
    ) : p.push("-c:v", "copy"), g.length > 0 ? p.push("-af", g.join(",")) : p.push("-c:a", "copy"), p.push("-progress", "pipe:1", "-nostdin", "-y", r);
    const w = Yr();
    console.log("Running FFmpeg command:", [w, ...p].join(" ")), console.log(
      "Playback speed:",
      l,
      "type:",
      typeof l
    ), console.log("Video filters:", m), console.log("Audio filters:", g), console.log(
      "Speed condition check:",
      l && l !== 1
    );
    const S = ie(w, p, {
      stdio: ["ignore", "pipe", "pipe"]
    }), k = es.getAllWindows()[0];
    let y = 0, b = 0, A = -1, F = Date.now(), P = 0;
    const C = 0.3;
    let q = "";
    (E = S.stdout) == null || E.setEncoding("utf8"), (O = S.stdout) == null || O.on("data", (T) => {
      for (const He of T.split(/\r?\n/)) {
        if (!He.includes("=")) continue;
        const [Pt, Hr] = He.split("=", 2), It = (Hr ?? "").trim();
        if (Pt === "out_time_us") {
          const ve = parseInt(It, 10);
          Number.isNaN(ve) || (y = ve / 1e6);
        } else if (Pt === "out_time_ms") {
          const ve = parseInt(It, 10);
          Number.isNaN(ve) || (y = ve / 1e3);
        } else Pt === "out_time" && (y = Math.max(y, zr(It)));
      }
      const Se = Math.max(0, y - a);
      b = Math.min(h, Math.max(b, Se));
      const je = Math.max(1e-3, (Date.now() - F) / 1e3), $s = b / je;
      P = P === 0 ? $s : C * $s + (1 - C) * P;
      const qe = Math.max(0, Math.min(100, b / h * 100)), Ur = Math.max(0, h - b), jr = Math.max(0.2, Math.min(P, 6)), qr = Math.round(Ur / (jr || 0.2));
      if (k && (qe - A >= 1 || qe === 100)) {
        A = qe;
        const He = {
          progress: Math.round(qe),
          time: b,
          speed: Number(P.toFixed(2)),
          eta: qr
        };
        k.webContents.send("ffmpeg.progress", He);
      }
    }), (I = S.stderr) == null || I.setEncoding("utf8"), (ee = S.stderr) == null || ee.on("data", (T) => {
      q += T, console.log("[ffmpeg]", T.trim());
    }), S.on("close", (T) => {
      if (T === 0) {
        if (k) {
          const Se = {
            progress: 100,
            time: d,
            speed: Number(P.toFixed(2)) || 1,
            eta: 0
          };
          k.webContents.send("ffmpeg.progress", Se);
        }
        e({ success: !0, outputPath: r });
      } else
        t(
          new Error(
            `FFmpeg exited with code ${T}
${q || "No additional error info"}`
          )
        );
    }), S.on("error", (T) => {
      t(new Error(`Failed to start FFmpeg: ${T.message}`));
    });
  });
}
async function nn(n) {
  try {
    console.log("Clipping video with params:", n), console.log("ClipVideo - playbackSpeed:", n.playbackSpeed);
    const {
      inputPath: e,
      outputPath: t,
      startTime: s,
      endTime: r,
      scaleToHeight: a,
      scaleFactor: i,
      playbackSpeed: o
    } = n;
    if (!e || !t)
      return {
        success: !1,
        error: "Input and output paths are required"
      };
    if (s < 0 || r <= s)
      return {
        success: !1,
        error: "Invalid time range: start time must be >= 0 and end time must be > start time"
      };
    const c = await Zr({
      inputPath: e,
      outputPath: t,
      startTime: s,
      endTime: r,
      scaleToHeight: a,
      scaleFactor: i,
      playbackSpeed: o
    });
    return console.log("Video clipping completed:", c), c;
  } catch (e) {
    return console.error("Error clipping video:", e), {
      success: !1,
      error: e instanceof Error ? e.message : "Unknown error occurred while clipping video"
    };
  }
}
function ea(n) {
  if (n.startsWith("file://")) {
    const e = n.replace(/^file:\/\/+/, "");
    return e.startsWith("/") ? e : "/" + e;
  }
  return n;
}
async function ta(n) {
  try {
    console.log("Exporting video with params:", n), console.log("ExportVideo - playbackSpeed:", n.playbackSpeed);
    const { inputPath: e, startTime: t, endTime: s, scaleToHeight: r, scaleFactor: a, playbackSpeed: i } = n, o = ea(e);
    if (console.log("Original inputPath:", e), console.log("Converted inputPath:", o), !o)
      return {
        success: !1,
        error: "Input path is required"
      };
    if (t < 0 || s <= t)
      return {
        success: !1,
        error: "Invalid time range: start time must be >= 0 and end time must be > start time"
      };
    const c = await _t.showSaveDialog({
      title: "Save Trimmed Video",
      defaultPath: sa(o),
      filters: [
        {
          name: "Video Files",
          extensions: ["mp4", "avi", "mov", "mkv", "webm"]
        },
        { name: "All Files", extensions: ["*"] }
      ]
    });
    if (c.canceled || !c.filePath)
      return {
        success: !1,
        cancelled: !0
      };
    const l = c.filePath;
    try {
      Cs(o);
    } catch {
      return {
        success: !1,
        error: "Input video file not found. Please re-import the video."
      };
    }
    try {
      const d = Dt.dirname(l);
      if (!Cs(d).isDirectory())
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
      inputPath: o,
      outputPath: l,
      startTime: t,
      endTime: s,
      scaleToHeight: r,
      playbackSpeed: i
    });
    const h = await nn({
      inputPath: o,
      outputPath: l,
      startTime: t,
      endTime: s,
      scaleToHeight: r,
      scaleFactor: a,
      playbackSpeed: i
    });
    return console.log("handleClipVideo returned:", h), h;
  } catch (e) {
    return console.error("Error exporting video:", e), {
      success: !1,
      error: e instanceof Error ? e.message : "Unknown error occurred while exporting video"
    };
  }
}
function sa(n) {
  const e = Dt.parse(n), t = (/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-").slice(0, 19);
  return Dt.join(
    e.dir,
    `${e.name}_trimmed_${t}.mp4`
  );
}
async function na(n) {
  try {
    const { buffer: e, filename: t } = n, s = de(ss(), "clipforge-recordings");
    await ts(s, { recursive: !0 });
    const r = Date.now(), a = t.replace(/\.webm$/, `_${r}.webm`), i = de(s, a), o = Buffer.from(e);
    return await Gr(i, o), console.log("Recording saved to:", i), {
      success: !0,
      filePath: i
    };
  } catch (e) {
    return console.error("Failed to save recording:", e), {
      success: !1,
      error: e instanceof Error ? e.message : "Failed to save recording file"
    };
  }
}
async function ra(n) {
  return new Promise((e) => {
    console.log("Extracting metadata for:", n);
    const t = ie("ffprobe", [
      "-v",
      "quiet",
      "-print_format",
      "json",
      "-show_format",
      "-show_streams",
      n
    ]);
    let s = "", r = "";
    t.stdout.on("data", (a) => {
      s += a;
    }), t.stderr.on("data", (a) => {
      r += a;
    }), t.on("close", (a) => {
      if (a === 0)
        try {
          const i = JSON.parse(s), o = i.streams.find(
            (h) => h.codec_type === "video"
          );
          if (!o) {
            console.warn("No video stream found, using fallback metadata");
            const h = {
              duration: parseFloat(i.format.duration) || 10,
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
            console.log("Using fallback metadata:", h), e(h);
            return;
          }
          const c = (h) => {
            if (!h) return 30;
            if (h.includes("/")) {
              const [d, p] = h.split("/").map(Number);
              return p !== 0 ? d / p : 30;
            }
            return parseFloat(h) || 30;
          }, l = {
            duration: parseFloat(i.format.duration) || 10,
            width: o.width || 1920,
            height: o.height || 1080,
            format: i.format.format_name || "webm",
            bitrate: parseInt(i.format.bit_rate) || 0,
            fps: c(o.r_frame_rate)
          };
          console.log("Recording metadata extracted:", l), e(l);
        } catch (i) {
          console.error("Failed to parse recording metadata:", i), console.log("Raw output:", s), console.log("Error output:", r);
          const o = {
            duration: 10,
            width: 1920,
            height: 1080,
            format: "webm",
            bitrate: 0,
            fps: 30
          };
          console.log("Using fallback metadata due to parse error:", o), e(o);
        }
      else {
        console.error(`FFprobe failed with code ${a}:`, r), console.log("Raw output:", s);
        const i = {
          duration: 10,
          width: 1920,
          height: 1080,
          format: "webm",
          bitrate: 0,
          fps: 30
        };
        console.log("Using fallback metadata due to FFprobe failure:", i), e(i);
      }
    }), t.on("error", (a) => {
      console.error("FFprobe process error:", a);
      const i = {
        duration: 10,
        width: 1920,
        height: 1080,
        format: "webm",
        bitrate: 0,
        fps: 30
      };
      console.log("Using fallback metadata due to process error:", i), e(i);
    });
  });
}
async function aa(n) {
  try {
    const { webmPath: e, mp4Filename: t } = n, s = de(ss(), "clipforge-recordings");
    await ts(s, { recursive: !0 });
    const r = de(s, t), a = ie("ffmpeg", [
      "-i",
      e,
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
      r
    ]);
    return new Promise((i, o) => {
      let c = "";
      a.stderr.on("data", (l) => {
        c += l.toString();
      }), a.on("close", (l) => {
        l === 0 ? (console.log("WebM to MP4 conversion successful:", r), i(r)) : (console.error("FFmpeg conversion failed with code:", l), console.error("Error output:", c), o(new Error(`FFmpeg conversion failed: ${c}`)));
      }), a.on("error", (l) => {
        console.error("FFmpeg process error:", l), o(new Error("FFmpeg process failed"));
      });
    });
  } catch (e) {
    throw console.error("Failed to convert WebM to MP4:", e), new Error("Failed to convert WebM to MP4");
  }
}
async function ia() {
  try {
    return (await sn.getSources({
      types: ["screen", "window"],
      thumbnailSize: { width: 150, height: 150 }
    })).map((e) => ({
      id: e.id,
      name: e.name,
      thumbnail: e.thumbnail.toDataURL()
    }));
  } catch (n) {
    throw console.error("Failed to get screen sources:", n), new Error("Failed to get screen sources");
  }
}
async function oa(n) {
  try {
    const { videoPath: e, audioPath: t, outputFilename: s } = n, r = de(ss(), "clipforge-recordings");
    await ts(r, { recursive: !0 });
    const a = de(r, s);
    console.log("Merging audio and video:", { videoPath: e, audioPath: t, outputPath: a });
    const i = ie("ffmpeg", [
      "-i",
      e,
      // Input video (may or may not have audio)
      "-i",
      t,
      // Input audio
      "-c:v",
      "copy",
      // Copy video without re-encoding
      "-c:a",
      "libopus",
      // Encode audio as libopus for WebM compatibility
      "-map",
      "0:v:0",
      // Map video from first input
      "-map",
      "1:a:0",
      // Map audio from second input
      "-shortest",
      // End when shortest stream ends
      a
    ]);
    return new Promise((o, c) => {
      let l = "";
      i.stderr.on("data", (h) => {
        l += h.toString();
      }), i.on("close", (h) => {
        h === 0 ? (console.log("Audio and video merged successfully:", a), o(a)) : (console.error("FFmpeg merge failed with code:", h), console.error("Error output:", l), c(new Error(`FFmpeg merge failed: ${l}`)));
      }), i.on("error", (h) => {
        console.error("FFmpeg process error:", h), c(new Error("FFmpeg process failed"));
      });
    });
  } catch (e) {
    throw console.error("Failed to merge audio and video:", e), new Error("Failed to merge audio and video");
  }
}
async function ca(n) {
  try {
    const { screenPath: e, cameraPath: t, outputPath: s } = n;
    console.log("🎬 handleMergePiP called with params:", n), console.log("📁 PiP merge paths:", { screenPath: e, cameraPath: t, outputPath: s }), console.log("🔍 Checking if input files exist...");
    const r = await import("fs"), a = r.existsSync(e), i = r.existsSync(t);
    if (console.log("📋 File existence check:", {
      screenExists: a,
      cameraExists: i,
      screenPath: e,
      cameraPath: t
    }), !a)
      throw new Error(`Screen recording file not found: ${e}`);
    if (!i)
      throw new Error(`Camera recording file not found: ${t}`);
    const c = (await import("path")).extname(s).toLowerCase(), l = s;
    console.log("📁 Final output path:", l), console.log("📁 Output format:", c);
    let h, d, p;
    c === ".webm" ? (h = "libvpx-vp9", d = "libopus", p = "yuv420p") : (h = "libx264", d = "aac", p = "yuv420p"), console.log("🎥 Using codecs:", { videoCodec: h, audioCodec: d, pixelFormat: p });
    const m = [
      "-y",
      // Overwrite output file
      "-i",
      e,
      // Input screen video
      "-i",
      t,
      // Input camera video (with audio)
      "-filter_complex",
      "[1:v]scale=iw/4:-1[cam];[0:v][cam]overlay=W-w-30:H-h-30[v]",
      "-map",
      "[v]",
      // Use the composed video output
      "-map",
      "1:a?",
      // Take audio from camera (optional, no crash if missing)
      "-c:v",
      h,
      // Video codec based on output format
      "-c:a",
      d,
      // Audio codec based on output format
      "-pix_fmt",
      p,
      // Pixel format for universal playback
      "-shortest",
      // End when shortest stream ends
      l
      // Output to user's chosen location
    ];
    console.log("🎥 Running FFmpeg command:", ["ffmpeg", ...m].join(" "));
    const g = ie("ffmpeg", m);
    return new Promise((w, S) => {
      let k = "", y = "";
      g.stdout.on("data", (b) => {
        y += b.toString(), console.log("📺 FFmpeg stdout:", b.toString());
      }), g.stderr.on("data", (b) => {
        k += b.toString(), console.log("⚠️ FFmpeg stderr:", b.toString());
      }), g.on("close", (b) => {
        console.log("🔚 FFmpeg process closed with code:", b), b === 0 ? (console.log("✅ PiP video merged successfully:", l), w(l)) : (console.error("❌ FFmpeg PiP merge failed with code:", b), console.error("❌ Error output:", k), console.error("❌ Stdout output:", y), S(new Error(`FFmpeg PiP merge failed: ${k}`)));
      }), g.on("error", (b) => {
        console.error("❌ FFmpeg process error:", b), S(new Error("FFmpeg process failed"));
      });
    });
  } catch (e) {
    throw console.error("Failed to merge PiP video:", e), new Error("Failed to merge PiP video");
  }
}
async function la() {
  try {
    const n = await sn.getSources({
      types: ["screen", "window"],
      thumbnailSize: { width: 150, height: 150 }
    });
    if (n.length === 0)
      throw new Error("No screen sources available");
    if (n.length === 1)
      return n[0].id;
    const e = await _t.showMessageBox({
      type: "question",
      buttons: n.map((t) => t.name),
      defaultId: 0,
      title: "Select Screen Source",
      message: "Choose which screen or window to record:",
      detail: "Select the source you want to record from the list below."
    });
    return e.response >= 0 && e.response < n.length ? n[e.response].id : null;
  } catch (n) {
    throw console.error("Failed to show source selection dialog:", n), new Error("Failed to show source selection dialog");
  }
}
function R(n, e, t, s, r) {
  if (typeof e == "function" ? n !== e || !0 : !e.has(n))
    throw new TypeError("Cannot write private member to an object whose class did not declare it");
  return e.set(n, t), t;
}
function u(n, e, t, s) {
  if (t === "a" && !s)
    throw new TypeError("Private accessor was defined without a getter");
  if (typeof e == "function" ? n !== e || !s : !e.has(n))
    throw new TypeError("Cannot read private member from an object whose class did not declare it");
  return t === "m" ? s : t === "a" ? s.call(n) : s ? s.value : e.get(n);
}
let rn = function() {
  const { crypto: n } = globalThis;
  if (n != null && n.randomUUID)
    return rn = n.randomUUID.bind(n), n.randomUUID();
  const e = new Uint8Array(1), t = n ? () => n.getRandomValues(e)[0] : () => Math.random() * 255 & 255;
  return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (s) => (+s ^ t() & 15 >> +s / 4).toString(16));
};
function Bt(n) {
  return typeof n == "object" && n !== null && // Spec-compliant fetch implementations
  ("name" in n && n.name === "AbortError" || // Expo fetch
  "message" in n && String(n.message).includes("FetchRequestCanceledException"));
}
const Wt = (n) => {
  if (n instanceof Error)
    return n;
  if (typeof n == "object" && n !== null) {
    try {
      if (Object.prototype.toString.call(n) === "[object Error]") {
        const e = new Error(n.message, n.cause ? { cause: n.cause } : {});
        return n.stack && (e.stack = n.stack), n.cause && !e.cause && (e.cause = n.cause), n.name && (e.name = n.name), e;
      }
    } catch {
    }
    try {
      return new Error(JSON.stringify(n));
    } catch {
    }
  }
  return new Error(n);
};
class v extends Error {
}
class U extends v {
  constructor(e, t, s, r) {
    super(`${U.makeMessage(e, t, s)}`), this.status = e, this.headers = r, this.requestID = r == null ? void 0 : r.get("x-request-id"), this.error = t;
    const a = t;
    this.code = a == null ? void 0 : a.code, this.param = a == null ? void 0 : a.param, this.type = a == null ? void 0 : a.type;
  }
  static makeMessage(e, t, s) {
    const r = t != null && t.message ? typeof t.message == "string" ? t.message : JSON.stringify(t.message) : t ? JSON.stringify(t) : s;
    return e && r ? `${e} ${r}` : e ? `${e} status code (no body)` : r || "(no status code or body)";
  }
  static generate(e, t, s, r) {
    if (!e || !r)
      return new wt({ message: s, cause: Wt(t) });
    const a = t == null ? void 0 : t.error;
    return e === 400 ? new an(e, a, s, r) : e === 401 ? new on(e, a, s, r) : e === 403 ? new cn(e, a, s, r) : e === 404 ? new ln(e, a, s, r) : e === 409 ? new un(e, a, s, r) : e === 422 ? new dn(e, a, s, r) : e === 429 ? new hn(e, a, s, r) : e >= 500 ? new fn(e, a, s, r) : new U(e, a, s, r);
  }
}
class G extends U {
  constructor({ message: e } = {}) {
    super(void 0, void 0, e || "Request was aborted.", void 0);
  }
}
class wt extends U {
  constructor({ message: e, cause: t }) {
    super(void 0, void 0, e || "Connection error.", void 0), t && (this.cause = t);
  }
}
class ns extends wt {
  constructor({ message: e } = {}) {
    super({ message: e ?? "Request timed out." });
  }
}
class an extends U {
}
class on extends U {
}
class cn extends U {
}
class ln extends U {
}
class un extends U {
}
class dn extends U {
}
class hn extends U {
}
class fn extends U {
}
class mn extends v {
  constructor() {
    super("Could not parse response content as the length limit was reached");
  }
}
class pn extends v {
  constructor() {
    super("Could not parse response content as the request was rejected by the content filter");
  }
}
class Re extends Error {
  constructor(e) {
    super(e);
  }
}
const ua = /^[a-z][a-z0-9+.-]*:/i, da = (n) => ua.test(n);
let J = (n) => (J = Array.isArray, J(n)), Ps = J;
function gn(n) {
  return typeof n != "object" ? {} : n ?? {};
}
function ha(n) {
  if (!n)
    return !0;
  for (const e in n)
    return !1;
  return !0;
}
function fa(n, e) {
  return Object.prototype.hasOwnProperty.call(n, e);
}
function Et(n) {
  return n != null && typeof n == "object" && !Array.isArray(n);
}
const ma = (n, e) => {
  if (typeof e != "number" || !Number.isInteger(e))
    throw new v(`${n} must be an integer`);
  if (e < 0)
    throw new v(`${n} must be a positive integer`);
  return e;
}, pa = (n) => {
  try {
    return JSON.parse(n);
  } catch {
    return;
  }
}, Be = (n) => new Promise((e) => setTimeout(e, n)), ge = "6.7.0", ga = () => (
  // @ts-ignore
  typeof window < "u" && // @ts-ignore
  typeof window.document < "u" && // @ts-ignore
  typeof navigator < "u"
);
function _a() {
  return typeof Deno < "u" && Deno.build != null ? "deno" : typeof EdgeRuntime < "u" ? "edge" : Object.prototype.toString.call(typeof globalThis.process < "u" ? globalThis.process : 0) === "[object process]" ? "node" : "unknown";
}
const wa = () => {
  var t;
  const n = _a();
  if (n === "deno")
    return {
      "X-Stainless-Lang": "js",
      "X-Stainless-Package-Version": ge,
      "X-Stainless-OS": Es(Deno.build.os),
      "X-Stainless-Arch": Is(Deno.build.arch),
      "X-Stainless-Runtime": "deno",
      "X-Stainless-Runtime-Version": typeof Deno.version == "string" ? Deno.version : ((t = Deno.version) == null ? void 0 : t.deno) ?? "unknown"
    };
  if (typeof EdgeRuntime < "u")
    return {
      "X-Stainless-Lang": "js",
      "X-Stainless-Package-Version": ge,
      "X-Stainless-OS": "Unknown",
      "X-Stainless-Arch": `other:${EdgeRuntime}`,
      "X-Stainless-Runtime": "edge",
      "X-Stainless-Runtime-Version": globalThis.process.version
    };
  if (n === "node")
    return {
      "X-Stainless-Lang": "js",
      "X-Stainless-Package-Version": ge,
      "X-Stainless-OS": Es(globalThis.process.platform ?? "unknown"),
      "X-Stainless-Arch": Is(globalThis.process.arch ?? "unknown"),
      "X-Stainless-Runtime": "node",
      "X-Stainless-Runtime-Version": globalThis.process.version ?? "unknown"
    };
  const e = ya();
  return e ? {
    "X-Stainless-Lang": "js",
    "X-Stainless-Package-Version": ge,
    "X-Stainless-OS": "Unknown",
    "X-Stainless-Arch": "unknown",
    "X-Stainless-Runtime": `browser:${e.browser}`,
    "X-Stainless-Runtime-Version": e.version
  } : {
    "X-Stainless-Lang": "js",
    "X-Stainless-Package-Version": ge,
    "X-Stainless-OS": "Unknown",
    "X-Stainless-Arch": "unknown",
    "X-Stainless-Runtime": "unknown",
    "X-Stainless-Runtime-Version": "unknown"
  };
};
function ya() {
  if (typeof navigator > "u" || !navigator)
    return null;
  const n = [
    { key: "edge", pattern: /Edge(?:\W+(\d+)\.(\d+)(?:\.(\d+))?)?/ },
    { key: "ie", pattern: /MSIE(?:\W+(\d+)\.(\d+)(?:\.(\d+))?)?/ },
    { key: "ie", pattern: /Trident(?:.*rv\:(\d+)\.(\d+)(?:\.(\d+))?)?/ },
    { key: "chrome", pattern: /Chrome(?:\W+(\d+)\.(\d+)(?:\.(\d+))?)?/ },
    { key: "firefox", pattern: /Firefox(?:\W+(\d+)\.(\d+)(?:\.(\d+))?)?/ },
    { key: "safari", pattern: /(?:Version\W+(\d+)\.(\d+)(?:\.(\d+))?)?(?:\W+Mobile\S*)?\W+Safari/ }
  ];
  for (const { key: e, pattern: t } of n) {
    const s = t.exec(navigator.userAgent);
    if (s) {
      const r = s[1] || 0, a = s[2] || 0, i = s[3] || 0;
      return { browser: e, version: `${r}.${a}.${i}` };
    }
  }
  return null;
}
const Is = (n) => n === "x32" ? "x32" : n === "x86_64" || n === "x64" ? "x64" : n === "arm" ? "arm" : n === "aarch64" || n === "arm64" ? "arm64" : n ? `other:${n}` : "unknown", Es = (n) => (n = n.toLowerCase(), n.includes("ios") ? "iOS" : n === "android" ? "Android" : n === "darwin" ? "MacOS" : n === "win32" ? "Windows" : n === "freebsd" ? "FreeBSD" : n === "openbsd" ? "OpenBSD" : n === "linux" ? "Linux" : n ? `Other:${n}` : "Unknown");
let ks;
const ba = () => ks ?? (ks = wa());
function xa() {
  if (typeof fetch < "u")
    return fetch;
  throw new Error("`fetch` is not defined as a global; Either pass `fetch` to the client, `new OpenAI({ fetch })` or polyfill the global, `globalThis.fetch = fetch`");
}
function _n(...n) {
  const e = globalThis.ReadableStream;
  if (typeof e > "u")
    throw new Error("`ReadableStream` is not defined as a global; You will need to polyfill it, `globalThis.ReadableStream = ReadableStream`");
  return new e(...n);
}
function wn(n) {
  let e = Symbol.asyncIterator in n ? n[Symbol.asyncIterator]() : n[Symbol.iterator]();
  return _n({
    start() {
    },
    async pull(t) {
      const { done: s, value: r } = await e.next();
      s ? t.close() : t.enqueue(r);
    },
    async cancel() {
      var t;
      await ((t = e.return) == null ? void 0 : t.call(e));
    }
  });
}
function yn(n) {
  if (n[Symbol.asyncIterator])
    return n;
  const e = n.getReader();
  return {
    async next() {
      try {
        const t = await e.read();
        return t != null && t.done && e.releaseLock(), t;
      } catch (t) {
        throw e.releaseLock(), t;
      }
    },
    async return() {
      const t = e.cancel();
      return e.releaseLock(), await t, { done: !0, value: void 0 };
    },
    [Symbol.asyncIterator]() {
      return this;
    }
  };
}
async function Sa(n) {
  var s, r;
  if (n === null || typeof n != "object")
    return;
  if (n[Symbol.asyncIterator]) {
    await ((r = (s = n[Symbol.asyncIterator]()).return) == null ? void 0 : r.call(s));
    return;
  }
  const e = n.getReader(), t = e.cancel();
  e.releaseLock(), await t;
}
const va = ({ headers: n, body: e }) => ({
  bodyHeaders: {
    "content-type": "application/json"
  },
  body: JSON.stringify(e)
}), bn = "RFC3986", xn = (n) => String(n), Os = {
  RFC1738: (n) => String(n).replace(/%20/g, "+"),
  RFC3986: xn
}, Aa = "RFC1738";
let Ut = (n, e) => (Ut = Object.hasOwn ?? Function.prototype.call.bind(Object.prototype.hasOwnProperty), Ut(n, e));
const z = /* @__PURE__ */ (() => {
  const n = [];
  for (let e = 0; e < 256; ++e)
    n.push("%" + ((e < 16 ? "0" : "") + e.toString(16)).toUpperCase());
  return n;
})(), kt = 1024, Ra = (n, e, t, s, r) => {
  if (n.length === 0)
    return n;
  let a = n;
  if (typeof n == "symbol" ? a = Symbol.prototype.toString.call(n) : typeof n != "string" && (a = String(n)), t === "iso-8859-1")
    return escape(a).replace(/%u[0-9a-f]{4}/gi, function(o) {
      return "%26%23" + parseInt(o.slice(2), 16) + "%3B";
    });
  let i = "";
  for (let o = 0; o < a.length; o += kt) {
    const c = a.length >= kt ? a.slice(o, o + kt) : a, l = [];
    for (let h = 0; h < c.length; ++h) {
      let d = c.charCodeAt(h);
      if (d === 45 || // -
      d === 46 || // .
      d === 95 || // _
      d === 126 || // ~
      d >= 48 && d <= 57 || // 0-9
      d >= 65 && d <= 90 || // a-z
      d >= 97 && d <= 122 || // A-Z
      r === Aa && (d === 40 || d === 41)) {
        l[l.length] = c.charAt(h);
        continue;
      }
      if (d < 128) {
        l[l.length] = z[d];
        continue;
      }
      if (d < 2048) {
        l[l.length] = z[192 | d >> 6] + z[128 | d & 63];
        continue;
      }
      if (d < 55296 || d >= 57344) {
        l[l.length] = z[224 | d >> 12] + z[128 | d >> 6 & 63] + z[128 | d & 63];
        continue;
      }
      h += 1, d = 65536 + ((d & 1023) << 10 | c.charCodeAt(h) & 1023), l[l.length] = z[240 | d >> 18] + z[128 | d >> 12 & 63] + z[128 | d >> 6 & 63] + z[128 | d & 63];
    }
    i += l.join("");
  }
  return i;
};
function $a(n) {
  return !n || typeof n != "object" ? !1 : !!(n.constructor && n.constructor.isBuffer && n.constructor.isBuffer(n));
}
function Fs(n, e) {
  if (J(n)) {
    const t = [];
    for (let s = 0; s < n.length; s += 1)
      t.push(e(n[s]));
    return t;
  }
  return e(n);
}
const Sn = {
  brackets(n) {
    return String(n) + "[]";
  },
  comma: "comma",
  indices(n, e) {
    return String(n) + "[" + e + "]";
  },
  repeat(n) {
    return String(n);
  }
}, vn = function(n, e) {
  Array.prototype.push.apply(n, J(e) ? e : [e]);
};
let Ts;
const L = {
  addQueryPrefix: !1,
  allowDots: !1,
  allowEmptyArrays: !1,
  arrayFormat: "indices",
  charset: "utf-8",
  charsetSentinel: !1,
  delimiter: "&",
  encode: !0,
  encodeDotInKeys: !1,
  encoder: Ra,
  encodeValuesOnly: !1,
  format: bn,
  formatter: xn,
  /** @deprecated */
  indices: !1,
  serializeDate(n) {
    return (Ts ?? (Ts = Function.prototype.call.bind(Date.prototype.toISOString)))(n);
  },
  skipNulls: !1,
  strictNullHandling: !1
};
function Ca(n) {
  return typeof n == "string" || typeof n == "number" || typeof n == "boolean" || typeof n == "symbol" || typeof n == "bigint";
}
const Ot = {};
function An(n, e, t, s, r, a, i, o, c, l, h, d, p, m, g, w, S, k) {
  let y = n, b = k, A = 0, F = !1;
  for (; (b = b.get(Ot)) !== void 0 && !F; ) {
    const O = b.get(n);
    if (A += 1, typeof O < "u") {
      if (O === A)
        throw new RangeError("Cyclic object value");
      F = !0;
    }
    typeof b.get(Ot) > "u" && (A = 0);
  }
  if (typeof l == "function" ? y = l(e, y) : y instanceof Date ? y = p == null ? void 0 : p(y) : t === "comma" && J(y) && (y = Fs(y, function(O) {
    return O instanceof Date ? p == null ? void 0 : p(O) : O;
  })), y === null) {
    if (a)
      return c && !w ? (
        // @ts-expect-error
        c(e, L.encoder, S, "key", m)
      ) : e;
    y = "";
  }
  if (Ca(y) || $a(y)) {
    if (c) {
      const O = w ? e : c(e, L.encoder, S, "key", m);
      return [
        (g == null ? void 0 : g(O)) + "=" + // @ts-expect-error
        (g == null ? void 0 : g(c(y, L.encoder, S, "value", m)))
      ];
    }
    return [(g == null ? void 0 : g(e)) + "=" + (g == null ? void 0 : g(String(y)))];
  }
  const P = [];
  if (typeof y > "u")
    return P;
  let C;
  if (t === "comma" && J(y))
    w && c && (y = Fs(y, c)), C = [{ value: y.length > 0 ? y.join(",") || null : void 0 }];
  else if (J(l))
    C = l;
  else {
    const O = Object.keys(y);
    C = h ? O.sort(h) : O;
  }
  const q = o ? String(e).replace(/\./g, "%2E") : String(e), E = s && J(y) && y.length === 1 ? q + "[]" : q;
  if (r && J(y) && y.length === 0)
    return E + "[]";
  for (let O = 0; O < C.length; ++O) {
    const I = C[O], ee = (
      // @ts-ignore
      typeof I == "object" && typeof I.value < "u" ? I.value : y[I]
    );
    if (i && ee === null)
      continue;
    const T = d && o ? I.replace(/\./g, "%2E") : I, Se = J(y) ? typeof t == "function" ? t(E, T) : E : E + (d ? "." + T : "[" + T + "]");
    k.set(n, A);
    const je = /* @__PURE__ */ new WeakMap();
    je.set(Ot, k), vn(P, An(
      ee,
      Se,
      t,
      s,
      r,
      a,
      i,
      o,
      // @ts-ignore
      t === "comma" && w && J(y) ? null : c,
      l,
      h,
      d,
      p,
      m,
      g,
      w,
      S,
      je
    ));
  }
  return P;
}
function Pa(n = L) {
  if (typeof n.allowEmptyArrays < "u" && typeof n.allowEmptyArrays != "boolean")
    throw new TypeError("`allowEmptyArrays` option can only be `true` or `false`, when provided");
  if (typeof n.encodeDotInKeys < "u" && typeof n.encodeDotInKeys != "boolean")
    throw new TypeError("`encodeDotInKeys` option can only be `true` or `false`, when provided");
  if (n.encoder !== null && typeof n.encoder < "u" && typeof n.encoder != "function")
    throw new TypeError("Encoder has to be a function.");
  const e = n.charset || L.charset;
  if (typeof n.charset < "u" && n.charset !== "utf-8" && n.charset !== "iso-8859-1")
    throw new TypeError("The charset option must be either utf-8, iso-8859-1, or undefined");
  let t = bn;
  if (typeof n.format < "u") {
    if (!Ut(Os, n.format))
      throw new TypeError("Unknown format option provided.");
    t = n.format;
  }
  const s = Os[t];
  let r = L.filter;
  (typeof n.filter == "function" || J(n.filter)) && (r = n.filter);
  let a;
  if (n.arrayFormat && n.arrayFormat in Sn ? a = n.arrayFormat : "indices" in n ? a = n.indices ? "indices" : "repeat" : a = L.arrayFormat, "commaRoundTrip" in n && typeof n.commaRoundTrip != "boolean")
    throw new TypeError("`commaRoundTrip` must be a boolean, or absent");
  const i = typeof n.allowDots > "u" ? n.encodeDotInKeys ? !0 : L.allowDots : !!n.allowDots;
  return {
    addQueryPrefix: typeof n.addQueryPrefix == "boolean" ? n.addQueryPrefix : L.addQueryPrefix,
    // @ts-ignore
    allowDots: i,
    allowEmptyArrays: typeof n.allowEmptyArrays == "boolean" ? !!n.allowEmptyArrays : L.allowEmptyArrays,
    arrayFormat: a,
    charset: e,
    charsetSentinel: typeof n.charsetSentinel == "boolean" ? n.charsetSentinel : L.charsetSentinel,
    commaRoundTrip: !!n.commaRoundTrip,
    delimiter: typeof n.delimiter > "u" ? L.delimiter : n.delimiter,
    encode: typeof n.encode == "boolean" ? n.encode : L.encode,
    encodeDotInKeys: typeof n.encodeDotInKeys == "boolean" ? n.encodeDotInKeys : L.encodeDotInKeys,
    encoder: typeof n.encoder == "function" ? n.encoder : L.encoder,
    encodeValuesOnly: typeof n.encodeValuesOnly == "boolean" ? n.encodeValuesOnly : L.encodeValuesOnly,
    filter: r,
    format: t,
    formatter: s,
    serializeDate: typeof n.serializeDate == "function" ? n.serializeDate : L.serializeDate,
    skipNulls: typeof n.skipNulls == "boolean" ? n.skipNulls : L.skipNulls,
    // @ts-ignore
    sort: typeof n.sort == "function" ? n.sort : null,
    strictNullHandling: typeof n.strictNullHandling == "boolean" ? n.strictNullHandling : L.strictNullHandling
  };
}
function Ia(n, e = {}) {
  let t = n;
  const s = Pa(e);
  let r, a;
  typeof s.filter == "function" ? (a = s.filter, t = a("", t)) : J(s.filter) && (a = s.filter, r = a);
  const i = [];
  if (typeof t != "object" || t === null)
    return "";
  const o = Sn[s.arrayFormat], c = o === "comma" && s.commaRoundTrip;
  r || (r = Object.keys(t)), s.sort && r.sort(s.sort);
  const l = /* @__PURE__ */ new WeakMap();
  for (let p = 0; p < r.length; ++p) {
    const m = r[p];
    s.skipNulls && t[m] === null || vn(i, An(
      t[m],
      m,
      // @ts-expect-error
      o,
      c,
      s.allowEmptyArrays,
      s.strictNullHandling,
      s.skipNulls,
      s.encodeDotInKeys,
      s.encode ? s.encoder : null,
      s.filter,
      s.sort,
      s.allowDots,
      s.serializeDate,
      s.format,
      s.formatter,
      s.encodeValuesOnly,
      s.charset,
      l
    ));
  }
  const h = i.join(s.delimiter);
  let d = s.addQueryPrefix === !0 ? "?" : "";
  return s.charsetSentinel && (s.charset === "iso-8859-1" ? d += "utf8=%26%2310003%3B&" : d += "utf8=%E2%9C%93&"), h.length > 0 ? d + h : "";
}
function Ea(n) {
  let e = 0;
  for (const r of n)
    e += r.length;
  const t = new Uint8Array(e);
  let s = 0;
  for (const r of n)
    t.set(r, s), s += r.length;
  return t;
}
let Ms;
function rs(n) {
  let e;
  return (Ms ?? (e = new globalThis.TextEncoder(), Ms = e.encode.bind(e)))(n);
}
let Ns;
function Ls(n) {
  let e;
  return (Ns ?? (e = new globalThis.TextDecoder(), Ns = e.decode.bind(e)))(n);
}
var V, X;
class yt {
  constructor() {
    V.set(this, void 0), X.set(this, void 0), R(this, V, new Uint8Array()), R(this, X, null);
  }
  decode(e) {
    if (e == null)
      return [];
    const t = e instanceof ArrayBuffer ? new Uint8Array(e) : typeof e == "string" ? rs(e) : e;
    R(this, V, Ea([u(this, V, "f"), t]));
    const s = [];
    let r;
    for (; (r = ka(u(this, V, "f"), u(this, X, "f"))) != null; ) {
      if (r.carriage && u(this, X, "f") == null) {
        R(this, X, r.index);
        continue;
      }
      if (u(this, X, "f") != null && (r.index !== u(this, X, "f") + 1 || r.carriage)) {
        s.push(Ls(u(this, V, "f").subarray(0, u(this, X, "f") - 1))), R(this, V, u(this, V, "f").subarray(u(this, X, "f"))), R(this, X, null);
        continue;
      }
      const a = u(this, X, "f") !== null ? r.preceding - 1 : r.preceding, i = Ls(u(this, V, "f").subarray(0, a));
      s.push(i), R(this, V, u(this, V, "f").subarray(r.index)), R(this, X, null);
    }
    return s;
  }
  flush() {
    return u(this, V, "f").length ? this.decode(`
`) : [];
  }
}
V = /* @__PURE__ */ new WeakMap(), X = /* @__PURE__ */ new WeakMap();
yt.NEWLINE_CHARS = /* @__PURE__ */ new Set([`
`, "\r"]);
yt.NEWLINE_REGEXP = /\r\n|[\n\r]/g;
function ka(n, e) {
  for (let r = e ?? 0; r < n.length; r++) {
    if (n[r] === 10)
      return { preceding: r, index: r + 1, carriage: !1 };
    if (n[r] === 13)
      return { preceding: r, index: r + 1, carriage: !0 };
  }
  return null;
}
function Oa(n) {
  for (let s = 0; s < n.length - 1; s++) {
    if (n[s] === 10 && n[s + 1] === 10 || n[s] === 13 && n[s + 1] === 13)
      return s + 2;
    if (n[s] === 13 && n[s + 1] === 10 && s + 3 < n.length && n[s + 2] === 13 && n[s + 3] === 10)
      return s + 4;
  }
  return -1;
}
const ct = {
  off: 0,
  error: 200,
  warn: 300,
  info: 400,
  debug: 500
}, Ds = (n, e, t) => {
  if (n) {
    if (fa(ct, n))
      return n;
    B(t).warn(`${e} was set to ${JSON.stringify(n)}, expected one of ${JSON.stringify(Object.keys(ct))}`);
  }
};
function $e() {
}
function Je(n, e, t) {
  return !e || ct[n] > ct[t] ? $e : e[n].bind(e);
}
const Fa = {
  error: $e,
  warn: $e,
  info: $e,
  debug: $e
};
let Bs = /* @__PURE__ */ new WeakMap();
function B(n) {
  const e = n.logger, t = n.logLevel ?? "off";
  if (!e)
    return Fa;
  const s = Bs.get(e);
  if (s && s[0] === t)
    return s[1];
  const r = {
    error: Je("error", e, t),
    warn: Je("warn", e, t),
    info: Je("info", e, t),
    debug: Je("debug", e, t)
  };
  return Bs.set(e, [t, r]), r;
}
const oe = (n) => (n.options && (n.options = { ...n.options }, delete n.options.headers), n.headers && (n.headers = Object.fromEntries((n.headers instanceof Headers ? [...n.headers] : Object.entries(n.headers)).map(([e, t]) => [
  e,
  e.toLowerCase() === "authorization" || e.toLowerCase() === "cookie" || e.toLowerCase() === "set-cookie" ? "***" : t
]))), "retryOfRequestLogID" in n && (n.retryOfRequestLogID && (n.retryOf = n.retryOfRequestLogID), delete n.retryOfRequestLogID), n);
var Ae;
class Z {
  constructor(e, t, s) {
    this.iterator = e, Ae.set(this, void 0), this.controller = t, R(this, Ae, s);
  }
  static fromSSEResponse(e, t, s) {
    let r = !1;
    const a = s ? B(s) : console;
    async function* i() {
      if (r)
        throw new v("Cannot iterate over a consumed stream, use `.tee()` to split the stream.");
      r = !0;
      let o = !1;
      try {
        for await (const c of Ta(e, t))
          if (!o) {
            if (c.data.startsWith("[DONE]")) {
              o = !0;
              continue;
            }
            if (c.event === null || !c.event.startsWith("thread.")) {
              let l;
              try {
                l = JSON.parse(c.data);
              } catch (h) {
                throw a.error("Could not parse message into JSON:", c.data), a.error("From chunk:", c.raw), h;
              }
              if (l && l.error)
                throw new U(void 0, l.error, void 0, e.headers);
              yield l;
            } else {
              let l;
              try {
                l = JSON.parse(c.data);
              } catch (h) {
                throw console.error("Could not parse message into JSON:", c.data), console.error("From chunk:", c.raw), h;
              }
              if (c.event == "error")
                throw new U(void 0, l.error, l.message, void 0);
              yield { event: c.event, data: l };
            }
          }
        o = !0;
      } catch (c) {
        if (Bt(c))
          return;
        throw c;
      } finally {
        o || t.abort();
      }
    }
    return new Z(i, t, s);
  }
  /**
   * Generates a Stream from a newline-separated ReadableStream
   * where each item is a JSON value.
   */
  static fromReadableStream(e, t, s) {
    let r = !1;
    async function* a() {
      const o = new yt(), c = yn(e);
      for await (const l of c)
        for (const h of o.decode(l))
          yield h;
      for (const l of o.flush())
        yield l;
    }
    async function* i() {
      if (r)
        throw new v("Cannot iterate over a consumed stream, use `.tee()` to split the stream.");
      r = !0;
      let o = !1;
      try {
        for await (const c of a())
          o || c && (yield JSON.parse(c));
        o = !0;
      } catch (c) {
        if (Bt(c))
          return;
        throw c;
      } finally {
        o || t.abort();
      }
    }
    return new Z(i, t, s);
  }
  [(Ae = /* @__PURE__ */ new WeakMap(), Symbol.asyncIterator)]() {
    return this.iterator();
  }
  /**
   * Splits the stream into two streams which can be
   * independently read from at different speeds.
   */
  tee() {
    const e = [], t = [], s = this.iterator(), r = (a) => ({
      next: () => {
        if (a.length === 0) {
          const i = s.next();
          e.push(i), t.push(i);
        }
        return a.shift();
      }
    });
    return [
      new Z(() => r(e), this.controller, u(this, Ae, "f")),
      new Z(() => r(t), this.controller, u(this, Ae, "f"))
    ];
  }
  /**
   * Converts this stream to a newline-separated ReadableStream of
   * JSON stringified values in the stream
   * which can be turned back into a Stream with `Stream.fromReadableStream()`.
   */
  toReadableStream() {
    const e = this;
    let t;
    return _n({
      async start() {
        t = e[Symbol.asyncIterator]();
      },
      async pull(s) {
        try {
          const { value: r, done: a } = await t.next();
          if (a)
            return s.close();
          const i = rs(JSON.stringify(r) + `
`);
          s.enqueue(i);
        } catch (r) {
          s.error(r);
        }
      },
      async cancel() {
        var s;
        await ((s = t.return) == null ? void 0 : s.call(t));
      }
    });
  }
}
async function* Ta(n, e) {
  if (!n.body)
    throw e.abort(), typeof globalThis.navigator < "u" && globalThis.navigator.product === "ReactNative" ? new v("The default react-native fetch implementation does not support streaming. Please use expo/fetch: https://docs.expo.dev/versions/latest/sdk/expo/#expofetch-api") : new v("Attempted to iterate over a response with no body");
  const t = new Na(), s = new yt(), r = yn(n.body);
  for await (const a of Ma(r))
    for (const i of s.decode(a)) {
      const o = t.decode(i);
      o && (yield o);
    }
  for (const a of s.flush()) {
    const i = t.decode(a);
    i && (yield i);
  }
}
async function* Ma(n) {
  let e = new Uint8Array();
  for await (const t of n) {
    if (t == null)
      continue;
    const s = t instanceof ArrayBuffer ? new Uint8Array(t) : typeof t == "string" ? rs(t) : t;
    let r = new Uint8Array(e.length + s.length);
    r.set(e), r.set(s, e.length), e = r;
    let a;
    for (; (a = Oa(e)) !== -1; )
      yield e.slice(0, a), e = e.slice(a);
  }
  e.length > 0 && (yield e);
}
class Na {
  constructor() {
    this.event = null, this.data = [], this.chunks = [];
  }
  decode(e) {
    if (e.endsWith("\r") && (e = e.substring(0, e.length - 1)), !e) {
      if (!this.event && !this.data.length)
        return null;
      const a = {
        event: this.event,
        data: this.data.join(`
`),
        raw: this.chunks
      };
      return this.event = null, this.data = [], this.chunks = [], a;
    }
    if (this.chunks.push(e), e.startsWith(":"))
      return null;
    let [t, s, r] = La(e, ":");
    return r.startsWith(" ") && (r = r.substring(1)), t === "event" ? this.event = r : t === "data" && this.data.push(r), null;
  }
}
function La(n, e) {
  const t = n.indexOf(e);
  return t !== -1 ? [n.substring(0, t), e, n.substring(t + e.length)] : [n, "", ""];
}
async function Rn(n, e) {
  const { response: t, requestLogID: s, retryOfRequestLogID: r, startTime: a } = e, i = await (async () => {
    var d;
    if (e.options.stream)
      return B(n).debug("response", t.status, t.url, t.headers, t.body), e.options.__streamClass ? e.options.__streamClass.fromSSEResponse(t, e.controller, n) : Z.fromSSEResponse(t, e.controller, n);
    if (t.status === 204)
      return null;
    if (e.options.__binaryResponse)
      return t;
    const o = t.headers.get("content-type"), c = (d = o == null ? void 0 : o.split(";")[0]) == null ? void 0 : d.trim();
    if ((c == null ? void 0 : c.includes("application/json")) || (c == null ? void 0 : c.endsWith("+json"))) {
      const p = await t.json();
      return $n(p, t);
    }
    return await t.text();
  })();
  return B(n).debug(`[${s}] response parsed`, oe({
    retryOfRequestLogID: r,
    url: t.url,
    status: t.status,
    body: i,
    durationMs: Date.now() - a
  })), i;
}
function $n(n, e) {
  return !n || typeof n != "object" || Array.isArray(n) ? n : Object.defineProperty(n, "_request_id", {
    value: e.headers.get("x-request-id"),
    enumerable: !1
  });
}
var Ce;
class bt extends Promise {
  constructor(e, t, s = Rn) {
    super((r) => {
      r(null);
    }), this.responsePromise = t, this.parseResponse = s, Ce.set(this, void 0), R(this, Ce, e);
  }
  _thenUnwrap(e) {
    return new bt(u(this, Ce, "f"), this.responsePromise, async (t, s) => $n(e(await this.parseResponse(t, s), s), s.response));
  }
  /**
   * Gets the raw `Response` instance instead of parsing the response
   * data.
   *
   * If you want to parse the response body but still get the `Response`
   * instance, you can use {@link withResponse()}.
   *
   * 👋 Getting the wrong TypeScript type for `Response`?
   * Try setting `"moduleResolution": "NodeNext"` or add `"lib": ["DOM"]`
   * to your `tsconfig.json`.
   */
  asResponse() {
    return this.responsePromise.then((e) => e.response);
  }
  /**
   * Gets the parsed response data, the raw `Response` instance and the ID of the request,
   * returned via the X-Request-ID header which is useful for debugging requests and reporting
   * issues to OpenAI.
   *
   * If you just want to get the raw `Response` instance without parsing it,
   * you can use {@link asResponse()}.
   *
   * 👋 Getting the wrong TypeScript type for `Response`?
   * Try setting `"moduleResolution": "NodeNext"` or add `"lib": ["DOM"]`
   * to your `tsconfig.json`.
   */
  async withResponse() {
    const [e, t] = await Promise.all([this.parse(), this.asResponse()]);
    return { data: e, response: t, request_id: t.headers.get("x-request-id") };
  }
  parse() {
    return this.parsedPromise || (this.parsedPromise = this.responsePromise.then((e) => this.parseResponse(u(this, Ce, "f"), e))), this.parsedPromise;
  }
  then(e, t) {
    return this.parse().then(e, t);
  }
  catch(e) {
    return this.parse().catch(e);
  }
  finally(e) {
    return this.parse().finally(e);
  }
}
Ce = /* @__PURE__ */ new WeakMap();
var Ve;
class as {
  constructor(e, t, s, r) {
    Ve.set(this, void 0), R(this, Ve, e), this.options = r, this.response = t, this.body = s;
  }
  hasNextPage() {
    return this.getPaginatedItems().length ? this.nextPageRequestOptions() != null : !1;
  }
  async getNextPage() {
    const e = this.nextPageRequestOptions();
    if (!e)
      throw new v("No next page expected; please check `.hasNextPage()` before calling `.getNextPage()`.");
    return await u(this, Ve, "f").requestAPIList(this.constructor, e);
  }
  async *iterPages() {
    let e = this;
    for (yield e; e.hasNextPage(); )
      e = await e.getNextPage(), yield e;
  }
  async *[(Ve = /* @__PURE__ */ new WeakMap(), Symbol.asyncIterator)]() {
    for await (const e of this.iterPages())
      for (const t of e.getPaginatedItems())
        yield t;
  }
}
class Da extends bt {
  constructor(e, t, s) {
    super(e, t, async (r, a) => new s(r, a.response, await Rn(r, a), a.options));
  }
  /**
   * Allow auto-paginating iteration on an unawaited list call, eg:
   *
   *    for await (const item of client.items.list()) {
   *      console.log(item)
   *    }
   */
  async *[Symbol.asyncIterator]() {
    const e = await this;
    for await (const t of e)
      yield t;
  }
}
class xt extends as {
  constructor(e, t, s, r) {
    super(e, t, s, r), this.data = s.data || [], this.object = s.object;
  }
  getPaginatedItems() {
    return this.data ?? [];
  }
  nextPageRequestOptions() {
    return null;
  }
}
class M extends as {
  constructor(e, t, s, r) {
    super(e, t, s, r), this.data = s.data || [], this.has_more = s.has_more || !1;
  }
  getPaginatedItems() {
    return this.data ?? [];
  }
  hasNextPage() {
    return this.has_more === !1 ? !1 : super.hasNextPage();
  }
  nextPageRequestOptions() {
    var s;
    const e = this.getPaginatedItems(), t = (s = e[e.length - 1]) == null ? void 0 : s.id;
    return t ? {
      ...this.options,
      query: {
        ...gn(this.options.query),
        after: t
      }
    } : null;
  }
}
class lt extends as {
  constructor(e, t, s, r) {
    super(e, t, s, r), this.data = s.data || [], this.has_more = s.has_more || !1, this.last_id = s.last_id || "";
  }
  getPaginatedItems() {
    return this.data ?? [];
  }
  hasNextPage() {
    return this.has_more === !1 ? !1 : super.hasNextPage();
  }
  nextPageRequestOptions() {
    const e = this.last_id;
    return e ? {
      ...this.options,
      query: {
        ...gn(this.options.query),
        after: e
      }
    } : null;
  }
}
const Cn = () => {
  var n;
  if (typeof File > "u") {
    const { process: e } = globalThis, t = typeof ((n = e == null ? void 0 : e.versions) == null ? void 0 : n.node) == "string" && parseInt(e.versions.node.split(".")) < 20;
    throw new Error("`File` is not defined as a global, which is required for file uploads." + (t ? " Update to Node 20 LTS or newer, or set `globalThis.File` to `import('node:buffer').File`." : ""));
  }
};
function Te(n, e, t) {
  return Cn(), new File(n, e ?? "unknown_file", t);
}
function Ye(n) {
  return (typeof n == "object" && n !== null && ("name" in n && n.name && String(n.name) || "url" in n && n.url && String(n.url) || "filename" in n && n.filename && String(n.filename) || "path" in n && n.path && String(n.path)) || "").split(/[\\/]/).pop() || void 0;
}
const is = (n) => n != null && typeof n == "object" && typeof n[Symbol.asyncIterator] == "function", Ws = async (n, e) => jt(n.body) ? { ...n, body: await Pn(n.body, e) } : n, he = async (n, e) => ({ ...n, body: await Pn(n.body, e) }), Us = /* @__PURE__ */ new WeakMap();
function Ba(n) {
  const e = typeof n == "function" ? n : n.fetch, t = Us.get(e);
  if (t)
    return t;
  const s = (async () => {
    try {
      const r = "Response" in e ? e.Response : (await e("data:,")).constructor, a = new FormData();
      return a.toString() !== await new r(a).text();
    } catch {
      return !0;
    }
  })();
  return Us.set(e, s), s;
}
const Pn = async (n, e) => {
  if (!await Ba(e))
    throw new TypeError("The provided fetch function does not support file uploads with the current global FormData class.");
  const t = new FormData();
  return await Promise.all(Object.entries(n || {}).map(([s, r]) => qt(t, s, r))), t;
}, In = (n) => n instanceof Blob && "name" in n, Wa = (n) => typeof n == "object" && n !== null && (n instanceof Response || is(n) || In(n)), jt = (n) => {
  if (Wa(n))
    return !0;
  if (Array.isArray(n))
    return n.some(jt);
  if (n && typeof n == "object") {
    for (const e in n)
      if (jt(n[e]))
        return !0;
  }
  return !1;
}, qt = async (n, e, t) => {
  if (t !== void 0) {
    if (t == null)
      throw new TypeError(`Received null for "${e}"; to pass null in FormData, you must use the string 'null'`);
    if (typeof t == "string" || typeof t == "number" || typeof t == "boolean")
      n.append(e, String(t));
    else if (t instanceof Response)
      n.append(e, Te([await t.blob()], Ye(t)));
    else if (is(t))
      n.append(e, Te([await new Response(wn(t)).blob()], Ye(t)));
    else if (In(t))
      n.append(e, t, Ye(t));
    else if (Array.isArray(t))
      await Promise.all(t.map((s) => qt(n, e + "[]", s)));
    else if (typeof t == "object")
      await Promise.all(Object.entries(t).map(([s, r]) => qt(n, `${e}[${s}]`, r)));
    else
      throw new TypeError(`Invalid value given to form, expected a string, number, boolean, object, Array, File or Blob but got ${t} instead`);
  }
}, En = (n) => n != null && typeof n == "object" && typeof n.size == "number" && typeof n.type == "string" && typeof n.text == "function" && typeof n.slice == "function" && typeof n.arrayBuffer == "function", Ua = (n) => n != null && typeof n == "object" && typeof n.name == "string" && typeof n.lastModified == "number" && En(n), ja = (n) => n != null && typeof n == "object" && typeof n.url == "string" && typeof n.blob == "function";
async function qa(n, e, t) {
  if (Cn(), n = await n, Ua(n))
    return n instanceof File ? n : Te([await n.arrayBuffer()], n.name);
  if (ja(n)) {
    const r = await n.blob();
    return e || (e = new URL(n.url).pathname.split(/[\\/]/).pop()), Te(await Ht(r), e, t);
  }
  const s = await Ht(n);
  if (e || (e = Ye(n)), !(t != null && t.type)) {
    const r = s.find((a) => typeof a == "object" && "type" in a && a.type);
    typeof r == "string" && (t = { ...t, type: r });
  }
  return Te(s, e, t);
}
async function Ht(n) {
  var t;
  let e = [];
  if (typeof n == "string" || ArrayBuffer.isView(n) || // includes Uint8Array, Buffer, etc.
  n instanceof ArrayBuffer)
    e.push(n);
  else if (En(n))
    e.push(n instanceof Blob ? n : await n.arrayBuffer());
  else if (is(n))
    for await (const s of n)
      e.push(...await Ht(s));
  else {
    const s = (t = n == null ? void 0 : n.constructor) == null ? void 0 : t.name;
    throw new Error(`Unexpected data type: ${typeof n}${s ? `; constructor: ${s}` : ""}${Ha(n)}`);
  }
  return e;
}
function Ha(n) {
  return typeof n != "object" || n === null ? "" : `; props: [${Object.getOwnPropertyNames(n).map((t) => `"${t}"`).join(", ")}]`;
}
class x {
  constructor(e) {
    this._client = e;
  }
}
function kn(n) {
  return n.replace(/[^A-Za-z0-9\-._~!$&'()*+,;=:@]+/g, encodeURIComponent);
}
const js = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.create(null)), Ja = (n = kn) => function(t, ...s) {
  if (t.length === 1)
    return t[0];
  let r = !1;
  const a = [], i = t.reduce((h, d, p) => {
    var w;
    /[?#]/.test(d) && (r = !0);
    const m = s[p];
    let g = (r ? encodeURIComponent : n)("" + m);
    return p !== s.length && (m == null || typeof m == "object" && // handle values from other realms
    m.toString === ((w = Object.getPrototypeOf(Object.getPrototypeOf(m.hasOwnProperty ?? js) ?? js)) == null ? void 0 : w.toString)) && (g = m + "", a.push({
      start: h.length + d.length,
      length: g.length,
      error: `Value of type ${Object.prototype.toString.call(m).slice(8, -1)} is not a valid path parameter`
    })), h + d + (p === s.length ? "" : g);
  }, ""), o = i.split(/[?#]/, 1)[0], c = new RegExp("(?<=^|\\/)(?:\\.|%2e){1,2}(?=\\/|$)", "gi");
  let l;
  for (; (l = c.exec(o)) !== null; )
    a.push({
      start: l.index,
      length: l[0].length,
      error: `Value "${l[0]}" can't be safely passed as a path parameter`
    });
  if (a.sort((h, d) => h.start - d.start), a.length > 0) {
    let h = 0;
    const d = a.reduce((p, m) => {
      const g = " ".repeat(m.start - h), w = "^".repeat(m.length);
      return h = m.start + m.length, p + g + w;
    }, "");
    throw new v(`Path parameters result in path with invalid segments:
${a.map((p) => p.error).join(`
`)}
${i}
${d}`);
  }
  return i;
}, f = /* @__PURE__ */ Ja(kn);
let On = class extends x {
  /**
   * Get the messages in a stored chat completion. Only Chat Completions that have
   * been created with the `store` parameter set to `true` will be returned.
   *
   * @example
   * ```ts
   * // Automatically fetches more pages as needed.
   * for await (const chatCompletionStoreMessage of client.chat.completions.messages.list(
   *   'completion_id',
   * )) {
   *   // ...
   * }
   * ```
   */
  list(e, t = {}, s) {
    return this._client.getAPIList(f`/chat/completions/${e}/messages`, M, { query: t, ...s });
  }
};
function ut(n) {
  return n !== void 0 && "function" in n && n.function !== void 0;
}
function os(n) {
  return (n == null ? void 0 : n.$brand) === "auto-parseable-response-format";
}
function We(n) {
  return (n == null ? void 0 : n.$brand) === "auto-parseable-tool";
}
function Va(n, e) {
  return !e || !Fn(e) ? {
    ...n,
    choices: n.choices.map((t) => (Tn(t.message.tool_calls), {
      ...t,
      message: {
        ...t.message,
        parsed: null,
        ...t.message.tool_calls ? {
          tool_calls: t.message.tool_calls
        } : void 0
      }
    }))
  } : cs(n, e);
}
function cs(n, e) {
  const t = n.choices.map((s) => {
    var r;
    if (s.finish_reason === "length")
      throw new mn();
    if (s.finish_reason === "content_filter")
      throw new pn();
    return Tn(s.message.tool_calls), {
      ...s,
      message: {
        ...s.message,
        ...s.message.tool_calls ? {
          tool_calls: ((r = s.message.tool_calls) == null ? void 0 : r.map((a) => Ka(e, a))) ?? void 0
        } : void 0,
        parsed: s.message.content && !s.message.refusal ? Xa(e, s.message.content) : null
      }
    };
  });
  return { ...n, choices: t };
}
function Xa(n, e) {
  var t, s;
  return ((t = n.response_format) == null ? void 0 : t.type) !== "json_schema" ? null : ((s = n.response_format) == null ? void 0 : s.type) === "json_schema" ? "$parseRaw" in n.response_format ? n.response_format.$parseRaw(e) : JSON.parse(e) : null;
}
function Ka(n, e) {
  var s;
  const t = (s = n.tools) == null ? void 0 : s.find((r) => {
    var a;
    return ut(r) && ((a = r.function) == null ? void 0 : a.name) === e.function.name;
  });
  return {
    ...e,
    function: {
      ...e.function,
      parsed_arguments: We(t) ? t.$parseRaw(e.function.arguments) : t != null && t.function.strict ? JSON.parse(e.function.arguments) : null
    }
  };
}
function Ga(n, e) {
  var s;
  if (!n || !("tools" in n) || !n.tools)
    return !1;
  const t = (s = n.tools) == null ? void 0 : s.find((r) => {
    var a;
    return ut(r) && ((a = r.function) == null ? void 0 : a.name) === e.function.name;
  });
  return ut(t) && (We(t) || (t == null ? void 0 : t.function.strict) || !1);
}
function Fn(n) {
  var e;
  return os(n.response_format) ? !0 : ((e = n.tools) == null ? void 0 : e.some((t) => We(t) || t.type === "function" && t.function.strict === !0)) ?? !1;
}
function Tn(n) {
  for (const e of n || [])
    if (e.type !== "function")
      throw new v(`Currently only \`function\` tool calls are supported; Received \`${e.type}\``);
}
function Qa(n) {
  for (const e of n ?? []) {
    if (e.type !== "function")
      throw new v(`Currently only \`function\` tool types support auto-parsing; Received \`${e.type}\``);
    if (e.function.strict !== !0)
      throw new v(`The \`${e.function.name}\` tool is not marked with \`strict: true\`. Only strict function tools can be auto-parsed`);
  }
}
const dt = (n) => (n == null ? void 0 : n.role) === "assistant", Mn = (n) => (n == null ? void 0 : n.role) === "tool";
var Jt, Ze, et, Pe, Ie, tt, Ee, se, ke, ht, ft, _e, Nn;
class ls {
  constructor() {
    Jt.add(this), this.controller = new AbortController(), Ze.set(this, void 0), et.set(this, () => {
    }), Pe.set(this, () => {
    }), Ie.set(this, void 0), tt.set(this, () => {
    }), Ee.set(this, () => {
    }), se.set(this, {}), ke.set(this, !1), ht.set(this, !1), ft.set(this, !1), _e.set(this, !1), R(this, Ze, new Promise((e, t) => {
      R(this, et, e, "f"), R(this, Pe, t, "f");
    })), R(this, Ie, new Promise((e, t) => {
      R(this, tt, e, "f"), R(this, Ee, t, "f");
    })), u(this, Ze, "f").catch(() => {
    }), u(this, Ie, "f").catch(() => {
    });
  }
  _run(e) {
    setTimeout(() => {
      e().then(() => {
        this._emitFinal(), this._emit("end");
      }, u(this, Jt, "m", Nn).bind(this));
    }, 0);
  }
  _connected() {
    this.ended || (u(this, et, "f").call(this), this._emit("connect"));
  }
  get ended() {
    return u(this, ke, "f");
  }
  get errored() {
    return u(this, ht, "f");
  }
  get aborted() {
    return u(this, ft, "f");
  }
  abort() {
    this.controller.abort();
  }
  /**
   * Adds the listener function to the end of the listeners array for the event.
   * No checks are made to see if the listener has already been added. Multiple calls passing
   * the same combination of event and listener will result in the listener being added, and
   * called, multiple times.
   * @returns this ChatCompletionStream, so that calls can be chained
   */
  on(e, t) {
    return (u(this, se, "f")[e] || (u(this, se, "f")[e] = [])).push({ listener: t }), this;
  }
  /**
   * Removes the specified listener from the listener array for the event.
   * off() will remove, at most, one instance of a listener from the listener array. If any single
   * listener has been added multiple times to the listener array for the specified event, then
   * off() must be called multiple times to remove each instance.
   * @returns this ChatCompletionStream, so that calls can be chained
   */
  off(e, t) {
    const s = u(this, se, "f")[e];
    if (!s)
      return this;
    const r = s.findIndex((a) => a.listener === t);
    return r >= 0 && s.splice(r, 1), this;
  }
  /**
   * Adds a one-time listener function for the event. The next time the event is triggered,
   * this listener is removed and then invoked.
   * @returns this ChatCompletionStream, so that calls can be chained
   */
  once(e, t) {
    return (u(this, se, "f")[e] || (u(this, se, "f")[e] = [])).push({ listener: t, once: !0 }), this;
  }
  /**
   * This is similar to `.once()`, but returns a Promise that resolves the next time
   * the event is triggered, instead of calling a listener callback.
   * @returns a Promise that resolves the next time given event is triggered,
   * or rejects if an error is emitted.  (If you request the 'error' event,
   * returns a promise that resolves with the error).
   *
   * Example:
   *
   *   const message = await stream.emitted('message') // rejects if the stream errors
   */
  emitted(e) {
    return new Promise((t, s) => {
      R(this, _e, !0), e !== "error" && this.once("error", s), this.once(e, t);
    });
  }
  async done() {
    R(this, _e, !0), await u(this, Ie, "f");
  }
  _emit(e, ...t) {
    if (u(this, ke, "f"))
      return;
    e === "end" && (R(this, ke, !0), u(this, tt, "f").call(this));
    const s = u(this, se, "f")[e];
    if (s && (u(this, se, "f")[e] = s.filter((r) => !r.once), s.forEach(({ listener: r }) => r(...t))), e === "abort") {
      const r = t[0];
      !u(this, _e, "f") && !(s != null && s.length) && Promise.reject(r), u(this, Pe, "f").call(this, r), u(this, Ee, "f").call(this, r), this._emit("end");
      return;
    }
    if (e === "error") {
      const r = t[0];
      !u(this, _e, "f") && !(s != null && s.length) && Promise.reject(r), u(this, Pe, "f").call(this, r), u(this, Ee, "f").call(this, r), this._emit("end");
    }
  }
  _emitFinal() {
  }
}
Ze = /* @__PURE__ */ new WeakMap(), et = /* @__PURE__ */ new WeakMap(), Pe = /* @__PURE__ */ new WeakMap(), Ie = /* @__PURE__ */ new WeakMap(), tt = /* @__PURE__ */ new WeakMap(), Ee = /* @__PURE__ */ new WeakMap(), se = /* @__PURE__ */ new WeakMap(), ke = /* @__PURE__ */ new WeakMap(), ht = /* @__PURE__ */ new WeakMap(), ft = /* @__PURE__ */ new WeakMap(), _e = /* @__PURE__ */ new WeakMap(), Jt = /* @__PURE__ */ new WeakSet(), Nn = function(e) {
  if (R(this, ht, !0), e instanceof Error && e.name === "AbortError" && (e = new G()), e instanceof G)
    return R(this, ft, !0), this._emit("abort", e);
  if (e instanceof v)
    return this._emit("error", e);
  if (e instanceof Error) {
    const t = new v(e.message);
    return t.cause = e, this._emit("error", t);
  }
  return this._emit("error", new v(String(e)));
};
function za(n) {
  return typeof n.parse == "function";
}
var H, Vt, mt, Xt, Kt, Gt, Ln, Dn;
const Ya = 10;
class Bn extends ls {
  constructor() {
    super(...arguments), H.add(this), this._chatCompletions = [], this.messages = [];
  }
  _addChatCompletion(e) {
    var s;
    this._chatCompletions.push(e), this._emit("chatCompletion", e);
    const t = (s = e.choices[0]) == null ? void 0 : s.message;
    return t && this._addMessage(t), e;
  }
  _addMessage(e, t = !0) {
    if ("content" in e || (e.content = null), this.messages.push(e), t) {
      if (this._emit("message", e), Mn(e) && e.content)
        this._emit("functionToolCallResult", e.content);
      else if (dt(e) && e.tool_calls)
        for (const s of e.tool_calls)
          s.type === "function" && this._emit("functionToolCall", s.function);
    }
  }
  /**
   * @returns a promise that resolves with the final ChatCompletion, or rejects
   * if an error occurred or the stream ended prematurely without producing a ChatCompletion.
   */
  async finalChatCompletion() {
    await this.done();
    const e = this._chatCompletions[this._chatCompletions.length - 1];
    if (!e)
      throw new v("stream ended without producing a ChatCompletion");
    return e;
  }
  /**
   * @returns a promise that resolves with the content of the final ChatCompletionMessage, or rejects
   * if an error occurred or the stream ended prematurely without producing a ChatCompletionMessage.
   */
  async finalContent() {
    return await this.done(), u(this, H, "m", Vt).call(this);
  }
  /**
   * @returns a promise that resolves with the the final assistant ChatCompletionMessage response,
   * or rejects if an error occurred or the stream ended prematurely without producing a ChatCompletionMessage.
   */
  async finalMessage() {
    return await this.done(), u(this, H, "m", mt).call(this);
  }
  /**
   * @returns a promise that resolves with the content of the final FunctionCall, or rejects
   * if an error occurred or the stream ended prematurely without producing a ChatCompletionMessage.
   */
  async finalFunctionToolCall() {
    return await this.done(), u(this, H, "m", Xt).call(this);
  }
  async finalFunctionToolCallResult() {
    return await this.done(), u(this, H, "m", Kt).call(this);
  }
  async totalUsage() {
    return await this.done(), u(this, H, "m", Gt).call(this);
  }
  allChatCompletions() {
    return [...this._chatCompletions];
  }
  _emitFinal() {
    const e = this._chatCompletions[this._chatCompletions.length - 1];
    e && this._emit("finalChatCompletion", e);
    const t = u(this, H, "m", mt).call(this);
    t && this._emit("finalMessage", t);
    const s = u(this, H, "m", Vt).call(this);
    s && this._emit("finalContent", s);
    const r = u(this, H, "m", Xt).call(this);
    r && this._emit("finalFunctionToolCall", r);
    const a = u(this, H, "m", Kt).call(this);
    a != null && this._emit("finalFunctionToolCallResult", a), this._chatCompletions.some((i) => i.usage) && this._emit("totalUsage", u(this, H, "m", Gt).call(this));
  }
  async _createChatCompletion(e, t, s) {
    const r = s == null ? void 0 : s.signal;
    r && (r.aborted && this.controller.abort(), r.addEventListener("abort", () => this.controller.abort())), u(this, H, "m", Ln).call(this, t);
    const a = await e.chat.completions.create({ ...t, stream: !1 }, { ...s, signal: this.controller.signal });
    return this._connected(), this._addChatCompletion(cs(a, t));
  }
  async _runChatCompletion(e, t, s) {
    for (const r of t.messages)
      this._addMessage(r, !1);
    return await this._createChatCompletion(e, t, s);
  }
  async _runTools(e, t, s) {
    var m, g, w;
    const r = "tool", { tool_choice: a = "auto", stream: i, ...o } = t, c = typeof a != "string" && a.type === "function" && ((m = a == null ? void 0 : a.function) == null ? void 0 : m.name), { maxChatCompletions: l = Ya } = s || {}, h = t.tools.map((S) => {
      if (We(S)) {
        if (!S.$callback)
          throw new v("Tool given to `.runTools()` that does not have an associated function");
        return {
          type: "function",
          function: {
            function: S.$callback,
            name: S.function.name,
            description: S.function.description || "",
            parameters: S.function.parameters,
            parse: S.$parseRaw,
            strict: !0
          }
        };
      }
      return S;
    }), d = {};
    for (const S of h)
      S.type === "function" && (d[S.function.name || S.function.function.name] = S.function);
    const p = "tools" in t ? h.map((S) => S.type === "function" ? {
      type: "function",
      function: {
        name: S.function.name || S.function.function.name,
        parameters: S.function.parameters,
        description: S.function.description,
        strict: S.function.strict
      }
    } : S) : void 0;
    for (const S of t.messages)
      this._addMessage(S, !1);
    for (let S = 0; S < l; ++S) {
      const y = (g = (await this._createChatCompletion(e, {
        ...o,
        tool_choice: a,
        tools: p,
        messages: [...this.messages]
      }, s)).choices[0]) == null ? void 0 : g.message;
      if (!y)
        throw new v("missing message in ChatCompletion response");
      if (!((w = y.tool_calls) != null && w.length))
        return;
      for (const b of y.tool_calls) {
        if (b.type !== "function")
          continue;
        const A = b.id, { name: F, arguments: P } = b.function, C = d[F];
        if (C) {
          if (c && c !== F) {
            const I = `Invalid tool_call: ${JSON.stringify(F)}. ${JSON.stringify(c)} requested. Please try again`;
            this._addMessage({ role: r, tool_call_id: A, content: I });
            continue;
          }
        } else {
          const I = `Invalid tool_call: ${JSON.stringify(F)}. Available options are: ${Object.keys(d).map((ee) => JSON.stringify(ee)).join(", ")}. Please try again`;
          this._addMessage({ role: r, tool_call_id: A, content: I });
          continue;
        }
        let q;
        try {
          q = za(C) ? await C.parse(P) : P;
        } catch (I) {
          const ee = I instanceof Error ? I.message : String(I);
          this._addMessage({ role: r, tool_call_id: A, content: ee });
          continue;
        }
        const E = await C.function(q, this), O = u(this, H, "m", Dn).call(this, E);
        if (this._addMessage({ role: r, tool_call_id: A, content: O }), c)
          return;
      }
    }
  }
}
H = /* @__PURE__ */ new WeakSet(), Vt = function() {
  return u(this, H, "m", mt).call(this).content ?? null;
}, mt = function() {
  let e = this.messages.length;
  for (; e-- > 0; ) {
    const t = this.messages[e];
    if (dt(t))
      return {
        ...t,
        content: t.content ?? null,
        refusal: t.refusal ?? null
      };
  }
  throw new v("stream ended without producing a ChatCompletionMessage with role=assistant");
}, Xt = function() {
  var e, t;
  for (let s = this.messages.length - 1; s >= 0; s--) {
    const r = this.messages[s];
    if (dt(r) && ((e = r == null ? void 0 : r.tool_calls) != null && e.length))
      return (t = r.tool_calls.filter((a) => a.type === "function").at(-1)) == null ? void 0 : t.function;
  }
}, Kt = function() {
  for (let e = this.messages.length - 1; e >= 0; e--) {
    const t = this.messages[e];
    if (Mn(t) && t.content != null && typeof t.content == "string" && this.messages.some((s) => {
      var r;
      return s.role === "assistant" && ((r = s.tool_calls) == null ? void 0 : r.some((a) => a.type === "function" && a.id === t.tool_call_id));
    }))
      return t.content;
  }
}, Gt = function() {
  const e = {
    completion_tokens: 0,
    prompt_tokens: 0,
    total_tokens: 0
  };
  for (const { usage: t } of this._chatCompletions)
    t && (e.completion_tokens += t.completion_tokens, e.prompt_tokens += t.prompt_tokens, e.total_tokens += t.total_tokens);
  return e;
}, Ln = function(e) {
  if (e.n != null && e.n > 1)
    throw new v("ChatCompletion convenience helpers only support n=1 at this time. To use n>1, please use chat.completions.create() directly.");
}, Dn = function(e) {
  return typeof e == "string" ? e : e === void 0 ? "undefined" : JSON.stringify(e);
};
class us extends Bn {
  static runTools(e, t, s) {
    const r = new us(), a = {
      ...s,
      headers: { ...s == null ? void 0 : s.headers, "X-Stainless-Helper-Method": "runTools" }
    };
    return r._run(() => r._runTools(e, t, a)), r;
  }
  _addMessage(e, t = !0) {
    super._addMessage(e, t), dt(e) && e.content && this._emit("content", e.content);
  }
}
const Wn = 1, Un = 2, jn = 4, qn = 8, Hn = 16, Jn = 32, Vn = 64, Xn = 128, Kn = 256, Gn = Xn | Kn, Qn = Hn | Jn | Gn | Vn, zn = Wn | Un | Qn, Yn = jn | qn, Za = zn | Yn, D = {
  STR: Wn,
  NUM: Un,
  ARR: jn,
  OBJ: qn,
  NULL: Hn,
  BOOL: Jn,
  NAN: Vn,
  INFINITY: Xn,
  MINUS_INFINITY: Kn,
  INF: Gn,
  SPECIAL: Qn,
  ATOM: zn,
  COLLECTION: Yn,
  ALL: Za
};
class ei extends Error {
}
class ti extends Error {
}
function si(n, e = D.ALL) {
  if (typeof n != "string")
    throw new TypeError(`expecting str, got ${typeof n}`);
  if (!n.trim())
    throw new Error(`${n} is empty`);
  return ni(n.trim(), e);
}
const ni = (n, e) => {
  const t = n.length;
  let s = 0;
  const r = (p) => {
    throw new ei(`${p} at position ${s}`);
  }, a = (p) => {
    throw new ti(`${p} at position ${s}`);
  }, i = () => (d(), s >= t && r("Unexpected end of input"), n[s] === '"' ? o() : n[s] === "{" ? c() : n[s] === "[" ? l() : n.substring(s, s + 4) === "null" || D.NULL & e && t - s < 4 && "null".startsWith(n.substring(s)) ? (s += 4, null) : n.substring(s, s + 4) === "true" || D.BOOL & e && t - s < 4 && "true".startsWith(n.substring(s)) ? (s += 4, !0) : n.substring(s, s + 5) === "false" || D.BOOL & e && t - s < 5 && "false".startsWith(n.substring(s)) ? (s += 5, !1) : n.substring(s, s + 8) === "Infinity" || D.INFINITY & e && t - s < 8 && "Infinity".startsWith(n.substring(s)) ? (s += 8, 1 / 0) : n.substring(s, s + 9) === "-Infinity" || D.MINUS_INFINITY & e && 1 < t - s && t - s < 9 && "-Infinity".startsWith(n.substring(s)) ? (s += 9, -1 / 0) : n.substring(s, s + 3) === "NaN" || D.NAN & e && t - s < 3 && "NaN".startsWith(n.substring(s)) ? (s += 3, NaN) : h()), o = () => {
    const p = s;
    let m = !1;
    for (s++; s < t && (n[s] !== '"' || m && n[s - 1] === "\\"); )
      m = n[s] === "\\" ? !m : !1, s++;
    if (n.charAt(s) == '"')
      try {
        return JSON.parse(n.substring(p, ++s - Number(m)));
      } catch (g) {
        a(String(g));
      }
    else if (D.STR & e)
      try {
        return JSON.parse(n.substring(p, s - Number(m)) + '"');
      } catch {
        return JSON.parse(n.substring(p, n.lastIndexOf("\\")) + '"');
      }
    r("Unterminated string literal");
  }, c = () => {
    s++, d();
    const p = {};
    try {
      for (; n[s] !== "}"; ) {
        if (d(), s >= t && D.OBJ & e)
          return p;
        const m = o();
        d(), s++;
        try {
          const g = i();
          Object.defineProperty(p, m, { value: g, writable: !0, enumerable: !0, configurable: !0 });
        } catch (g) {
          if (D.OBJ & e)
            return p;
          throw g;
        }
        d(), n[s] === "," && s++;
      }
    } catch {
      if (D.OBJ & e)
        return p;
      r("Expected '}' at end of object");
    }
    return s++, p;
  }, l = () => {
    s++;
    const p = [];
    try {
      for (; n[s] !== "]"; )
        p.push(i()), d(), n[s] === "," && s++;
    } catch {
      if (D.ARR & e)
        return p;
      r("Expected ']' at end of array");
    }
    return s++, p;
  }, h = () => {
    if (s === 0) {
      n === "-" && D.NUM & e && r("Not sure what '-' is");
      try {
        return JSON.parse(n);
      } catch (m) {
        if (D.NUM & e)
          try {
            return n[n.length - 1] === "." ? JSON.parse(n.substring(0, n.lastIndexOf("."))) : JSON.parse(n.substring(0, n.lastIndexOf("e")));
          } catch {
          }
        a(String(m));
      }
    }
    const p = s;
    for (n[s] === "-" && s++; n[s] && !",]}".includes(n[s]); )
      s++;
    s == t && !(D.NUM & e) && r("Unterminated number literal");
    try {
      return JSON.parse(n.substring(p, s));
    } catch {
      n.substring(p, s) === "-" && D.NUM & e && r("Not sure what '-' is");
      try {
        return JSON.parse(n.substring(p, n.lastIndexOf("e")));
      } catch (g) {
        a(String(g));
      }
    }
  }, d = () => {
    for (; s < t && ` 
\r	`.includes(n[s]); )
      s++;
  };
  return i();
}, qs = (n) => si(n, D.ALL ^ D.NUM);
var N, te, fe, ne, Ft, Xe, Tt, Mt, Nt, Ke, Lt, Hs;
class De extends Bn {
  constructor(e) {
    super(), N.add(this), te.set(this, void 0), fe.set(this, void 0), ne.set(this, void 0), R(this, te, e), R(this, fe, []);
  }
  get currentChatCompletionSnapshot() {
    return u(this, ne, "f");
  }
  /**
   * Intended for use on the frontend, consuming a stream produced with
   * `.toReadableStream()` on the backend.
   *
   * Note that messages sent to the model do not appear in `.on('message')`
   * in this context.
   */
  static fromReadableStream(e) {
    const t = new De(null);
    return t._run(() => t._fromReadableStream(e)), t;
  }
  static createChatCompletion(e, t, s) {
    const r = new De(t);
    return r._run(() => r._runChatCompletion(e, { ...t, stream: !0 }, { ...s, headers: { ...s == null ? void 0 : s.headers, "X-Stainless-Helper-Method": "stream" } })), r;
  }
  async _createChatCompletion(e, t, s) {
    var i;
    super._createChatCompletion;
    const r = s == null ? void 0 : s.signal;
    r && (r.aborted && this.controller.abort(), r.addEventListener("abort", () => this.controller.abort())), u(this, N, "m", Ft).call(this);
    const a = await e.chat.completions.create({ ...t, stream: !0 }, { ...s, signal: this.controller.signal });
    this._connected();
    for await (const o of a)
      u(this, N, "m", Tt).call(this, o);
    if ((i = a.controller.signal) != null && i.aborted)
      throw new G();
    return this._addChatCompletion(u(this, N, "m", Ke).call(this));
  }
  async _fromReadableStream(e, t) {
    var i;
    const s = t == null ? void 0 : t.signal;
    s && (s.aborted && this.controller.abort(), s.addEventListener("abort", () => this.controller.abort())), u(this, N, "m", Ft).call(this), this._connected();
    const r = Z.fromReadableStream(e, this.controller);
    let a;
    for await (const o of r)
      a && a !== o.id && this._addChatCompletion(u(this, N, "m", Ke).call(this)), u(this, N, "m", Tt).call(this, o), a = o.id;
    if ((i = r.controller.signal) != null && i.aborted)
      throw new G();
    return this._addChatCompletion(u(this, N, "m", Ke).call(this));
  }
  [(te = /* @__PURE__ */ new WeakMap(), fe = /* @__PURE__ */ new WeakMap(), ne = /* @__PURE__ */ new WeakMap(), N = /* @__PURE__ */ new WeakSet(), Ft = function() {
    this.ended || R(this, ne, void 0);
  }, Xe = function(t) {
    let s = u(this, fe, "f")[t.index];
    return s || (s = {
      content_done: !1,
      refusal_done: !1,
      logprobs_content_done: !1,
      logprobs_refusal_done: !1,
      done_tool_calls: /* @__PURE__ */ new Set(),
      current_tool_call_index: null
    }, u(this, fe, "f")[t.index] = s, s);
  }, Tt = function(t) {
    var r, a, i, o, c, l, h, d, p, m, g, w, S, k, y;
    if (this.ended)
      return;
    const s = u(this, N, "m", Hs).call(this, t);
    this._emit("chunk", t, s);
    for (const b of t.choices) {
      const A = s.choices[b.index];
      b.delta.content != null && ((r = A.message) == null ? void 0 : r.role) === "assistant" && ((a = A.message) != null && a.content) && (this._emit("content", b.delta.content, A.message.content), this._emit("content.delta", {
        delta: b.delta.content,
        snapshot: A.message.content,
        parsed: A.message.parsed
      })), b.delta.refusal != null && ((i = A.message) == null ? void 0 : i.role) === "assistant" && ((o = A.message) != null && o.refusal) && this._emit("refusal.delta", {
        delta: b.delta.refusal,
        snapshot: A.message.refusal
      }), ((c = b.logprobs) == null ? void 0 : c.content) != null && ((l = A.message) == null ? void 0 : l.role) === "assistant" && this._emit("logprobs.content.delta", {
        content: (h = b.logprobs) == null ? void 0 : h.content,
        snapshot: ((d = A.logprobs) == null ? void 0 : d.content) ?? []
      }), ((p = b.logprobs) == null ? void 0 : p.refusal) != null && ((m = A.message) == null ? void 0 : m.role) === "assistant" && this._emit("logprobs.refusal.delta", {
        refusal: (g = b.logprobs) == null ? void 0 : g.refusal,
        snapshot: ((w = A.logprobs) == null ? void 0 : w.refusal) ?? []
      });
      const F = u(this, N, "m", Xe).call(this, A);
      A.finish_reason && (u(this, N, "m", Nt).call(this, A), F.current_tool_call_index != null && u(this, N, "m", Mt).call(this, A, F.current_tool_call_index));
      for (const P of b.delta.tool_calls ?? [])
        F.current_tool_call_index !== P.index && (u(this, N, "m", Nt).call(this, A), F.current_tool_call_index != null && u(this, N, "m", Mt).call(this, A, F.current_tool_call_index)), F.current_tool_call_index = P.index;
      for (const P of b.delta.tool_calls ?? []) {
        const C = (S = A.message.tool_calls) == null ? void 0 : S[P.index];
        C != null && C.type && ((C == null ? void 0 : C.type) === "function" ? this._emit("tool_calls.function.arguments.delta", {
          name: (k = C.function) == null ? void 0 : k.name,
          index: P.index,
          arguments: C.function.arguments,
          parsed_arguments: C.function.parsed_arguments,
          arguments_delta: ((y = P.function) == null ? void 0 : y.arguments) ?? ""
        }) : (C == null || C.type, void 0));
      }
    }
  }, Mt = function(t, s) {
    var i, o, c;
    if (u(this, N, "m", Xe).call(this, t).done_tool_calls.has(s))
      return;
    const a = (i = t.message.tool_calls) == null ? void 0 : i[s];
    if (!a)
      throw new Error("no tool call snapshot");
    if (!a.type)
      throw new Error("tool call snapshot missing `type`");
    if (a.type === "function") {
      const l = (c = (o = u(this, te, "f")) == null ? void 0 : o.tools) == null ? void 0 : c.find((h) => ut(h) && h.function.name === a.function.name);
      this._emit("tool_calls.function.arguments.done", {
        name: a.function.name,
        index: s,
        arguments: a.function.arguments,
        parsed_arguments: We(l) ? l.$parseRaw(a.function.arguments) : l != null && l.function.strict ? JSON.parse(a.function.arguments) : null
      });
    } else
      a.type;
  }, Nt = function(t) {
    var r, a;
    const s = u(this, N, "m", Xe).call(this, t);
    if (t.message.content && !s.content_done) {
      s.content_done = !0;
      const i = u(this, N, "m", Lt).call(this);
      this._emit("content.done", {
        content: t.message.content,
        parsed: i ? i.$parseRaw(t.message.content) : null
      });
    }
    t.message.refusal && !s.refusal_done && (s.refusal_done = !0, this._emit("refusal.done", { refusal: t.message.refusal })), (r = t.logprobs) != null && r.content && !s.logprobs_content_done && (s.logprobs_content_done = !0, this._emit("logprobs.content.done", { content: t.logprobs.content })), (a = t.logprobs) != null && a.refusal && !s.logprobs_refusal_done && (s.logprobs_refusal_done = !0, this._emit("logprobs.refusal.done", { refusal: t.logprobs.refusal }));
  }, Ke = function() {
    if (this.ended)
      throw new v("stream has ended, this shouldn't happen");
    const t = u(this, ne, "f");
    if (!t)
      throw new v("request ended without sending any chunks");
    return R(this, ne, void 0), R(this, fe, []), ri(t, u(this, te, "f"));
  }, Lt = function() {
    var s;
    const t = (s = u(this, te, "f")) == null ? void 0 : s.response_format;
    return os(t) ? t : null;
  }, Hs = function(t) {
    var s, r, a, i;
    let o = u(this, ne, "f");
    const { choices: c, ...l } = t;
    o ? Object.assign(o, l) : o = R(this, ne, {
      ...l,
      choices: []
    });
    for (const { delta: h, finish_reason: d, index: p, logprobs: m = null, ...g } of t.choices) {
      let w = o.choices[p];
      if (w || (w = o.choices[p] = { finish_reason: d, index: p, message: {}, logprobs: m, ...g }), m)
        if (!w.logprobs)
          w.logprobs = Object.assign({}, m);
        else {
          const { content: P, refusal: C, ...q } = m;
          Object.assign(w.logprobs, q), P && ((s = w.logprobs).content ?? (s.content = []), w.logprobs.content.push(...P)), C && ((r = w.logprobs).refusal ?? (r.refusal = []), w.logprobs.refusal.push(...C));
        }
      if (d && (w.finish_reason = d, u(this, te, "f") && Fn(u(this, te, "f")))) {
        if (d === "length")
          throw new mn();
        if (d === "content_filter")
          throw new pn();
      }
      if (Object.assign(w, g), !h)
        continue;
      const { content: S, refusal: k, function_call: y, role: b, tool_calls: A, ...F } = h;
      if (Object.assign(w.message, F), k && (w.message.refusal = (w.message.refusal || "") + k), b && (w.message.role = b), y && (w.message.function_call ? (y.name && (w.message.function_call.name = y.name), y.arguments && ((a = w.message.function_call).arguments ?? (a.arguments = ""), w.message.function_call.arguments += y.arguments)) : w.message.function_call = y), S && (w.message.content = (w.message.content || "") + S, !w.message.refusal && u(this, N, "m", Lt).call(this) && (w.message.parsed = qs(w.message.content))), A) {
        w.message.tool_calls || (w.message.tool_calls = []);
        for (const { index: P, id: C, type: q, function: E, ...O } of A) {
          const I = (i = w.message.tool_calls)[P] ?? (i[P] = {});
          Object.assign(I, O), C && (I.id = C), q && (I.type = q), E && (I.function ?? (I.function = { name: E.name ?? "", arguments: "" })), E != null && E.name && (I.function.name = E.name), E != null && E.arguments && (I.function.arguments += E.arguments, Ga(u(this, te, "f"), I) && (I.function.parsed_arguments = qs(I.function.arguments)));
        }
      }
    }
    return o;
  }, Symbol.asyncIterator)]() {
    const e = [], t = [];
    let s = !1;
    return this.on("chunk", (r) => {
      const a = t.shift();
      a ? a.resolve(r) : e.push(r);
    }), this.on("end", () => {
      s = !0;
      for (const r of t)
        r.resolve(void 0);
      t.length = 0;
    }), this.on("abort", (r) => {
      s = !0;
      for (const a of t)
        a.reject(r);
      t.length = 0;
    }), this.on("error", (r) => {
      s = !0;
      for (const a of t)
        a.reject(r);
      t.length = 0;
    }), {
      next: async () => e.length ? { value: e.shift(), done: !1 } : s ? { value: void 0, done: !0 } : new Promise((a, i) => t.push({ resolve: a, reject: i })).then((a) => a ? { value: a, done: !1 } : { value: void 0, done: !0 }),
      return: async () => (this.abort(), { value: void 0, done: !0 })
    };
  }
  toReadableStream() {
    return new Z(this[Symbol.asyncIterator].bind(this), this.controller).toReadableStream();
  }
}
function ri(n, e) {
  const { id: t, choices: s, created: r, model: a, system_fingerprint: i, ...o } = n, c = {
    ...o,
    id: t,
    choices: s.map(({ message: l, finish_reason: h, index: d, logprobs: p, ...m }) => {
      if (!h)
        throw new v(`missing finish_reason for choice ${d}`);
      const { content: g = null, function_call: w, tool_calls: S, ...k } = l, y = l.role;
      if (!y)
        throw new v(`missing role for choice ${d}`);
      if (w) {
        const { arguments: b, name: A } = w;
        if (b == null)
          throw new v(`missing function_call.arguments for choice ${d}`);
        if (!A)
          throw new v(`missing function_call.name for choice ${d}`);
        return {
          ...m,
          message: {
            content: g,
            function_call: { arguments: b, name: A },
            role: y,
            refusal: l.refusal ?? null
          },
          finish_reason: h,
          index: d,
          logprobs: p
        };
      }
      return S ? {
        ...m,
        index: d,
        finish_reason: h,
        logprobs: p,
        message: {
          ...k,
          role: y,
          content: g,
          refusal: l.refusal ?? null,
          tool_calls: S.map((b, A) => {
            const { function: F, type: P, id: C, ...q } = b, { arguments: E, name: O, ...I } = F || {};
            if (C == null)
              throw new v(`missing choices[${d}].tool_calls[${A}].id
${Ge(n)}`);
            if (P == null)
              throw new v(`missing choices[${d}].tool_calls[${A}].type
${Ge(n)}`);
            if (O == null)
              throw new v(`missing choices[${d}].tool_calls[${A}].function.name
${Ge(n)}`);
            if (E == null)
              throw new v(`missing choices[${d}].tool_calls[${A}].function.arguments
${Ge(n)}`);
            return { ...q, id: C, type: P, function: { ...I, name: O, arguments: E } };
          })
        }
      } : {
        ...m,
        message: { ...k, content: g, role: y, refusal: l.refusal ?? null },
        finish_reason: h,
        index: d,
        logprobs: p
      };
    }),
    created: r,
    model: a,
    object: "chat.completion",
    ...i ? { system_fingerprint: i } : {}
  };
  return Va(c, e);
}
function Ge(n) {
  return JSON.stringify(n);
}
class pt extends De {
  static fromReadableStream(e) {
    const t = new pt(null);
    return t._run(() => t._fromReadableStream(e)), t;
  }
  static runTools(e, t, s) {
    const r = new pt(
      // @ts-expect-error TODO these types are incompatible
      t
    ), a = {
      ...s,
      headers: { ...s == null ? void 0 : s.headers, "X-Stainless-Helper-Method": "runTools" }
    };
    return r._run(() => r._runTools(e, t, a)), r;
  }
}
let ds = class extends x {
  constructor() {
    super(...arguments), this.messages = new On(this._client);
  }
  create(e, t) {
    return this._client.post("/chat/completions", { body: e, ...t, stream: e.stream ?? !1 });
  }
  /**
   * Get a stored chat completion. Only Chat Completions that have been created with
   * the `store` parameter set to `true` will be returned.
   *
   * @example
   * ```ts
   * const chatCompletion =
   *   await client.chat.completions.retrieve('completion_id');
   * ```
   */
  retrieve(e, t) {
    return this._client.get(f`/chat/completions/${e}`, t);
  }
  /**
   * Modify a stored chat completion. Only Chat Completions that have been created
   * with the `store` parameter set to `true` can be modified. Currently, the only
   * supported modification is to update the `metadata` field.
   *
   * @example
   * ```ts
   * const chatCompletion = await client.chat.completions.update(
   *   'completion_id',
   *   { metadata: { foo: 'string' } },
   * );
   * ```
   */
  update(e, t, s) {
    return this._client.post(f`/chat/completions/${e}`, { body: t, ...s });
  }
  /**
   * List stored Chat Completions. Only Chat Completions that have been stored with
   * the `store` parameter set to `true` will be returned.
   *
   * @example
   * ```ts
   * // Automatically fetches more pages as needed.
   * for await (const chatCompletion of client.chat.completions.list()) {
   *   // ...
   * }
   * ```
   */
  list(e = {}, t) {
    return this._client.getAPIList("/chat/completions", M, { query: e, ...t });
  }
  /**
   * Delete a stored chat completion. Only Chat Completions that have been created
   * with the `store` parameter set to `true` can be deleted.
   *
   * @example
   * ```ts
   * const chatCompletionDeleted =
   *   await client.chat.completions.delete('completion_id');
   * ```
   */
  delete(e, t) {
    return this._client.delete(f`/chat/completions/${e}`, t);
  }
  parse(e, t) {
    return Qa(e.tools), this._client.chat.completions.create(e, {
      ...t,
      headers: {
        ...t == null ? void 0 : t.headers,
        "X-Stainless-Helper-Method": "chat.completions.parse"
      }
    })._thenUnwrap((s) => cs(s, e));
  }
  runTools(e, t) {
    return e.stream ? pt.runTools(this._client, e, t) : us.runTools(this._client, e, t);
  }
  /**
   * Creates a chat completion stream
   */
  stream(e, t) {
    return De.createChatCompletion(this._client, e, t);
  }
};
ds.Messages = On;
class hs extends x {
  constructor() {
    super(...arguments), this.completions = new ds(this._client);
  }
}
hs.Completions = ds;
const Zn = /* @__PURE__ */ Symbol("brand.privateNullableHeaders");
function* ai(n) {
  if (!n)
    return;
  if (Zn in n) {
    const { values: s, nulls: r } = n;
    yield* s.entries();
    for (const a of r)
      yield [a, null];
    return;
  }
  let e = !1, t;
  n instanceof Headers ? t = n.entries() : Ps(n) ? t = n : (e = !0, t = Object.entries(n ?? {}));
  for (let s of t) {
    const r = s[0];
    if (typeof r != "string")
      throw new TypeError("expected header name to be a string");
    const a = Ps(s[1]) ? s[1] : [s[1]];
    let i = !1;
    for (const o of a)
      o !== void 0 && (e && !i && (i = !0, yield [r, null]), yield [r, o]);
  }
}
const _ = (n) => {
  const e = new Headers(), t = /* @__PURE__ */ new Set();
  for (const s of n) {
    const r = /* @__PURE__ */ new Set();
    for (const [a, i] of ai(s)) {
      const o = a.toLowerCase();
      r.has(o) || (e.delete(a), r.add(o)), i === null ? (e.delete(a), t.add(o)) : (e.append(a, i), t.delete(o));
    }
  }
  return { [Zn]: !0, values: e, nulls: t };
};
class er extends x {
  /**
   * Generates audio from the input text.
   *
   * @example
   * ```ts
   * const speech = await client.audio.speech.create({
   *   input: 'input',
   *   model: 'string',
   *   voice: 'ash',
   * });
   *
   * const content = await speech.blob();
   * console.log(content);
   * ```
   */
  create(e, t) {
    return this._client.post("/audio/speech", {
      body: e,
      ...t,
      headers: _([{ Accept: "application/octet-stream" }, t == null ? void 0 : t.headers]),
      __binaryResponse: !0
    });
  }
}
class tr extends x {
  create(e, t) {
    return this._client.post("/audio/transcriptions", he({
      body: e,
      ...t,
      stream: e.stream ?? !1,
      __metadata: { model: e.model }
    }, this._client));
  }
}
class sr extends x {
  create(e, t) {
    return this._client.post("/audio/translations", he({ body: e, ...t, __metadata: { model: e.model } }, this._client));
  }
}
class Ue extends x {
  constructor() {
    super(...arguments), this.transcriptions = new tr(this._client), this.translations = new sr(this._client), this.speech = new er(this._client);
  }
}
Ue.Transcriptions = tr;
Ue.Translations = sr;
Ue.Speech = er;
class nr extends x {
  /**
   * Creates and executes a batch from an uploaded file of requests
   */
  create(e, t) {
    return this._client.post("/batches", { body: e, ...t });
  }
  /**
   * Retrieves a batch.
   */
  retrieve(e, t) {
    return this._client.get(f`/batches/${e}`, t);
  }
  /**
   * List your organization's batches.
   */
  list(e = {}, t) {
    return this._client.getAPIList("/batches", M, { query: e, ...t });
  }
  /**
   * Cancels an in-progress batch. The batch will be in status `cancelling` for up to
   * 10 minutes, before changing to `cancelled`, where it will have partial results
   * (if any) available in the output file.
   */
  cancel(e, t) {
    return this._client.post(f`/batches/${e}/cancel`, t);
  }
}
class rr extends x {
  /**
   * Create an assistant with a model and instructions.
   *
   * @example
   * ```ts
   * const assistant = await client.beta.assistants.create({
   *   model: 'gpt-4o',
   * });
   * ```
   */
  create(e, t) {
    return this._client.post("/assistants", {
      body: e,
      ...t,
      headers: _([{ "OpenAI-Beta": "assistants=v2" }, t == null ? void 0 : t.headers])
    });
  }
  /**
   * Retrieves an assistant.
   *
   * @example
   * ```ts
   * const assistant = await client.beta.assistants.retrieve(
   *   'assistant_id',
   * );
   * ```
   */
  retrieve(e, t) {
    return this._client.get(f`/assistants/${e}`, {
      ...t,
      headers: _([{ "OpenAI-Beta": "assistants=v2" }, t == null ? void 0 : t.headers])
    });
  }
  /**
   * Modifies an assistant.
   *
   * @example
   * ```ts
   * const assistant = await client.beta.assistants.update(
   *   'assistant_id',
   * );
   * ```
   */
  update(e, t, s) {
    return this._client.post(f`/assistants/${e}`, {
      body: t,
      ...s,
      headers: _([{ "OpenAI-Beta": "assistants=v2" }, s == null ? void 0 : s.headers])
    });
  }
  /**
   * Returns a list of assistants.
   *
   * @example
   * ```ts
   * // Automatically fetches more pages as needed.
   * for await (const assistant of client.beta.assistants.list()) {
   *   // ...
   * }
   * ```
   */
  list(e = {}, t) {
    return this._client.getAPIList("/assistants", M, {
      query: e,
      ...t,
      headers: _([{ "OpenAI-Beta": "assistants=v2" }, t == null ? void 0 : t.headers])
    });
  }
  /**
   * Delete an assistant.
   *
   * @example
   * ```ts
   * const assistantDeleted =
   *   await client.beta.assistants.delete('assistant_id');
   * ```
   */
  delete(e, t) {
    return this._client.delete(f`/assistants/${e}`, {
      ...t,
      headers: _([{ "OpenAI-Beta": "assistants=v2" }, t == null ? void 0 : t.headers])
    });
  }
}
let ar = class extends x {
  /**
   * Create an ephemeral API token for use in client-side applications with the
   * Realtime API. Can be configured with the same session parameters as the
   * `session.update` client event.
   *
   * It responds with a session object, plus a `client_secret` key which contains a
   * usable ephemeral API token that can be used to authenticate browser clients for
   * the Realtime API.
   *
   * @example
   * ```ts
   * const session =
   *   await client.beta.realtime.sessions.create();
   * ```
   */
  create(e, t) {
    return this._client.post("/realtime/sessions", {
      body: e,
      ...t,
      headers: _([{ "OpenAI-Beta": "assistants=v2" }, t == null ? void 0 : t.headers])
    });
  }
};
class ir extends x {
  /**
   * Create an ephemeral API token for use in client-side applications with the
   * Realtime API specifically for realtime transcriptions. Can be configured with
   * the same session parameters as the `transcription_session.update` client event.
   *
   * It responds with a session object, plus a `client_secret` key which contains a
   * usable ephemeral API token that can be used to authenticate browser clients for
   * the Realtime API.
   *
   * @example
   * ```ts
   * const transcriptionSession =
   *   await client.beta.realtime.transcriptionSessions.create();
   * ```
   */
  create(e, t) {
    return this._client.post("/realtime/transcription_sessions", {
      body: e,
      ...t,
      headers: _([{ "OpenAI-Beta": "assistants=v2" }, t == null ? void 0 : t.headers])
    });
  }
}
let St = class extends x {
  constructor() {
    super(...arguments), this.sessions = new ar(this._client), this.transcriptionSessions = new ir(this._client);
  }
};
St.Sessions = ar;
St.TranscriptionSessions = ir;
class or extends x {
  /**
   * Create a ChatKit session
   *
   * @example
   * ```ts
   * const chatSession =
   *   await client.beta.chatkit.sessions.create({
   *     user: 'x',
   *     workflow: { id: 'id' },
   *   });
   * ```
   */
  create(e, t) {
    return this._client.post("/chatkit/sessions", {
      body: e,
      ...t,
      headers: _([{ "OpenAI-Beta": "chatkit_beta=v1" }, t == null ? void 0 : t.headers])
    });
  }
  /**
   * Cancel a ChatKit session
   *
   * @example
   * ```ts
   * const chatSession =
   *   await client.beta.chatkit.sessions.cancel('cksess_123');
   * ```
   */
  cancel(e, t) {
    return this._client.post(f`/chatkit/sessions/${e}/cancel`, {
      ...t,
      headers: _([{ "OpenAI-Beta": "chatkit_beta=v1" }, t == null ? void 0 : t.headers])
    });
  }
}
let cr = class extends x {
  /**
   * Retrieve a ChatKit thread
   *
   * @example
   * ```ts
   * const chatkitThread =
   *   await client.beta.chatkit.threads.retrieve('cthr_123');
   * ```
   */
  retrieve(e, t) {
    return this._client.get(f`/chatkit/threads/${e}`, {
      ...t,
      headers: _([{ "OpenAI-Beta": "chatkit_beta=v1" }, t == null ? void 0 : t.headers])
    });
  }
  /**
   * List ChatKit threads
   *
   * @example
   * ```ts
   * // Automatically fetches more pages as needed.
   * for await (const chatkitThread of client.beta.chatkit.threads.list()) {
   *   // ...
   * }
   * ```
   */
  list(e = {}, t) {
    return this._client.getAPIList("/chatkit/threads", lt, {
      query: e,
      ...t,
      headers: _([{ "OpenAI-Beta": "chatkit_beta=v1" }, t == null ? void 0 : t.headers])
    });
  }
  /**
   * Delete a ChatKit thread
   *
   * @example
   * ```ts
   * const thread = await client.beta.chatkit.threads.delete(
   *   'cthr_123',
   * );
   * ```
   */
  delete(e, t) {
    return this._client.delete(f`/chatkit/threads/${e}`, {
      ...t,
      headers: _([{ "OpenAI-Beta": "chatkit_beta=v1" }, t == null ? void 0 : t.headers])
    });
  }
  /**
   * List ChatKit thread items
   *
   * @example
   * ```ts
   * // Automatically fetches more pages as needed.
   * for await (const thread of client.beta.chatkit.threads.listItems(
   *   'cthr_123',
   * )) {
   *   // ...
   * }
   * ```
   */
  listItems(e, t = {}, s) {
    return this._client.getAPIList(f`/chatkit/threads/${e}/items`, lt, { query: t, ...s, headers: _([{ "OpenAI-Beta": "chatkit_beta=v1" }, s == null ? void 0 : s.headers]) });
  }
};
class vt extends x {
  constructor() {
    super(...arguments), this.sessions = new or(this._client), this.threads = new cr(this._client);
  }
}
vt.Sessions = or;
vt.Threads = cr;
class lr extends x {
  /**
   * Create a message.
   *
   * @deprecated The Assistants API is deprecated in favor of the Responses API
   */
  create(e, t, s) {
    return this._client.post(f`/threads/${e}/messages`, {
      body: t,
      ...s,
      headers: _([{ "OpenAI-Beta": "assistants=v2" }, s == null ? void 0 : s.headers])
    });
  }
  /**
   * Retrieve a message.
   *
   * @deprecated The Assistants API is deprecated in favor of the Responses API
   */
  retrieve(e, t, s) {
    const { thread_id: r } = t;
    return this._client.get(f`/threads/${r}/messages/${e}`, {
      ...s,
      headers: _([{ "OpenAI-Beta": "assistants=v2" }, s == null ? void 0 : s.headers])
    });
  }
  /**
   * Modifies a message.
   *
   * @deprecated The Assistants API is deprecated in favor of the Responses API
   */
  update(e, t, s) {
    const { thread_id: r, ...a } = t;
    return this._client.post(f`/threads/${r}/messages/${e}`, {
      body: a,
      ...s,
      headers: _([{ "OpenAI-Beta": "assistants=v2" }, s == null ? void 0 : s.headers])
    });
  }
  /**
   * Returns a list of messages for a given thread.
   *
   * @deprecated The Assistants API is deprecated in favor of the Responses API
   */
  list(e, t = {}, s) {
    return this._client.getAPIList(f`/threads/${e}/messages`, M, {
      query: t,
      ...s,
      headers: _([{ "OpenAI-Beta": "assistants=v2" }, s == null ? void 0 : s.headers])
    });
  }
  /**
   * Deletes a message.
   *
   * @deprecated The Assistants API is deprecated in favor of the Responses API
   */
  delete(e, t, s) {
    const { thread_id: r } = t;
    return this._client.delete(f`/threads/${r}/messages/${e}`, {
      ...s,
      headers: _([{ "OpenAI-Beta": "assistants=v2" }, s == null ? void 0 : s.headers])
    });
  }
}
class ur extends x {
  /**
   * Retrieves a run step.
   *
   * @deprecated The Assistants API is deprecated in favor of the Responses API
   */
  retrieve(e, t, s) {
    const { thread_id: r, run_id: a, ...i } = t;
    return this._client.get(f`/threads/${r}/runs/${a}/steps/${e}`, {
      query: i,
      ...s,
      headers: _([{ "OpenAI-Beta": "assistants=v2" }, s == null ? void 0 : s.headers])
    });
  }
  /**
   * Returns a list of run steps belonging to a run.
   *
   * @deprecated The Assistants API is deprecated in favor of the Responses API
   */
  list(e, t, s) {
    const { thread_id: r, ...a } = t;
    return this._client.getAPIList(f`/threads/${r}/runs/${e}/steps`, M, {
      query: a,
      ...s,
      headers: _([{ "OpenAI-Beta": "assistants=v2" }, s == null ? void 0 : s.headers])
    });
  }
}
const ii = (n) => {
  if (typeof Buffer < "u") {
    const e = Buffer.from(n, "base64");
    return Array.from(new Float32Array(e.buffer, e.byteOffset, e.length / Float32Array.BYTES_PER_ELEMENT));
  } else {
    const e = atob(n), t = e.length, s = new Uint8Array(t);
    for (let r = 0; r < t; r++)
      s[r] = e.charCodeAt(r);
    return Array.from(new Float32Array(s.buffer));
  }
}, me = (n) => {
  var e, t, s, r, a;
  if (typeof globalThis.process < "u")
    return ((t = (e = globalThis.process.env) == null ? void 0 : e[n]) == null ? void 0 : t.trim()) ?? void 0;
  if (typeof globalThis.Deno < "u")
    return (a = (r = (s = globalThis.Deno.env) == null ? void 0 : s.get) == null ? void 0 : r.call(s, n)) == null ? void 0 : a.trim();
};
var W, le, Qt, Y, st, Q, ue, ye, ce, gt, K, nt, rt, Me, Oe, Fe, Js, Vs, Xs, Ks, Gs, Qs, zs;
class Ne extends ls {
  constructor() {
    super(...arguments), W.add(this), Qt.set(this, []), Y.set(this, {}), st.set(this, {}), Q.set(this, void 0), ue.set(this, void 0), ye.set(this, void 0), ce.set(this, void 0), gt.set(this, void 0), K.set(this, void 0), nt.set(this, void 0), rt.set(this, void 0), Me.set(this, void 0);
  }
  [(Qt = /* @__PURE__ */ new WeakMap(), Y = /* @__PURE__ */ new WeakMap(), st = /* @__PURE__ */ new WeakMap(), Q = /* @__PURE__ */ new WeakMap(), ue = /* @__PURE__ */ new WeakMap(), ye = /* @__PURE__ */ new WeakMap(), ce = /* @__PURE__ */ new WeakMap(), gt = /* @__PURE__ */ new WeakMap(), K = /* @__PURE__ */ new WeakMap(), nt = /* @__PURE__ */ new WeakMap(), rt = /* @__PURE__ */ new WeakMap(), Me = /* @__PURE__ */ new WeakMap(), W = /* @__PURE__ */ new WeakSet(), Symbol.asyncIterator)]() {
    const e = [], t = [];
    let s = !1;
    return this.on("event", (r) => {
      const a = t.shift();
      a ? a.resolve(r) : e.push(r);
    }), this.on("end", () => {
      s = !0;
      for (const r of t)
        r.resolve(void 0);
      t.length = 0;
    }), this.on("abort", (r) => {
      s = !0;
      for (const a of t)
        a.reject(r);
      t.length = 0;
    }), this.on("error", (r) => {
      s = !0;
      for (const a of t)
        a.reject(r);
      t.length = 0;
    }), {
      next: async () => e.length ? { value: e.shift(), done: !1 } : s ? { value: void 0, done: !0 } : new Promise((a, i) => t.push({ resolve: a, reject: i })).then((a) => a ? { value: a, done: !1 } : { value: void 0, done: !0 }),
      return: async () => (this.abort(), { value: void 0, done: !0 })
    };
  }
  static fromReadableStream(e) {
    const t = new le();
    return t._run(() => t._fromReadableStream(e)), t;
  }
  async _fromReadableStream(e, t) {
    var a;
    const s = t == null ? void 0 : t.signal;
    s && (s.aborted && this.controller.abort(), s.addEventListener("abort", () => this.controller.abort())), this._connected();
    const r = Z.fromReadableStream(e, this.controller);
    for await (const i of r)
      u(this, W, "m", Oe).call(this, i);
    if ((a = r.controller.signal) != null && a.aborted)
      throw new G();
    return this._addRun(u(this, W, "m", Fe).call(this));
  }
  toReadableStream() {
    return new Z(this[Symbol.asyncIterator].bind(this), this.controller).toReadableStream();
  }
  static createToolAssistantStream(e, t, s, r) {
    const a = new le();
    return a._run(() => a._runToolAssistantStream(e, t, s, {
      ...r,
      headers: { ...r == null ? void 0 : r.headers, "X-Stainless-Helper-Method": "stream" }
    })), a;
  }
  async _createToolAssistantStream(e, t, s, r) {
    var c;
    const a = r == null ? void 0 : r.signal;
    a && (a.aborted && this.controller.abort(), a.addEventListener("abort", () => this.controller.abort()));
    const i = { ...s, stream: !0 }, o = await e.submitToolOutputs(t, i, {
      ...r,
      signal: this.controller.signal
    });
    this._connected();
    for await (const l of o)
      u(this, W, "m", Oe).call(this, l);
    if ((c = o.controller.signal) != null && c.aborted)
      throw new G();
    return this._addRun(u(this, W, "m", Fe).call(this));
  }
  static createThreadAssistantStream(e, t, s) {
    const r = new le();
    return r._run(() => r._threadAssistantStream(e, t, {
      ...s,
      headers: { ...s == null ? void 0 : s.headers, "X-Stainless-Helper-Method": "stream" }
    })), r;
  }
  static createAssistantStream(e, t, s, r) {
    const a = new le();
    return a._run(() => a._runAssistantStream(e, t, s, {
      ...r,
      headers: { ...r == null ? void 0 : r.headers, "X-Stainless-Helper-Method": "stream" }
    })), a;
  }
  currentEvent() {
    return u(this, nt, "f");
  }
  currentRun() {
    return u(this, rt, "f");
  }
  currentMessageSnapshot() {
    return u(this, Q, "f");
  }
  currentRunStepSnapshot() {
    return u(this, Me, "f");
  }
  async finalRunSteps() {
    return await this.done(), Object.values(u(this, Y, "f"));
  }
  async finalMessages() {
    return await this.done(), Object.values(u(this, st, "f"));
  }
  async finalRun() {
    if (await this.done(), !u(this, ue, "f"))
      throw Error("Final run was not received.");
    return u(this, ue, "f");
  }
  async _createThreadAssistantStream(e, t, s) {
    var o;
    const r = s == null ? void 0 : s.signal;
    r && (r.aborted && this.controller.abort(), r.addEventListener("abort", () => this.controller.abort()));
    const a = { ...t, stream: !0 }, i = await e.createAndRun(a, { ...s, signal: this.controller.signal });
    this._connected();
    for await (const c of i)
      u(this, W, "m", Oe).call(this, c);
    if ((o = i.controller.signal) != null && o.aborted)
      throw new G();
    return this._addRun(u(this, W, "m", Fe).call(this));
  }
  async _createAssistantStream(e, t, s, r) {
    var c;
    const a = r == null ? void 0 : r.signal;
    a && (a.aborted && this.controller.abort(), a.addEventListener("abort", () => this.controller.abort()));
    const i = { ...s, stream: !0 }, o = await e.create(t, i, { ...r, signal: this.controller.signal });
    this._connected();
    for await (const l of o)
      u(this, W, "m", Oe).call(this, l);
    if ((c = o.controller.signal) != null && c.aborted)
      throw new G();
    return this._addRun(u(this, W, "m", Fe).call(this));
  }
  static accumulateDelta(e, t) {
    for (const [s, r] of Object.entries(t)) {
      if (!e.hasOwnProperty(s)) {
        e[s] = r;
        continue;
      }
      let a = e[s];
      if (a == null) {
        e[s] = r;
        continue;
      }
      if (s === "index" || s === "type") {
        e[s] = r;
        continue;
      }
      if (typeof a == "string" && typeof r == "string")
        a += r;
      else if (typeof a == "number" && typeof r == "number")
        a += r;
      else if (Et(a) && Et(r))
        a = this.accumulateDelta(a, r);
      else if (Array.isArray(a) && Array.isArray(r)) {
        if (a.every((i) => typeof i == "string" || typeof i == "number")) {
          a.push(...r);
          continue;
        }
        for (const i of r) {
          if (!Et(i))
            throw new Error(`Expected array delta entry to be an object but got: ${i}`);
          const o = i.index;
          if (o == null)
            throw console.error(i), new Error("Expected array delta entry to have an `index` property");
          if (typeof o != "number")
            throw new Error(`Expected array delta entry \`index\` property to be a number but got ${o}`);
          const c = a[o];
          c == null ? a.push(i) : a[o] = this.accumulateDelta(c, i);
        }
        continue;
      } else
        throw Error(`Unhandled record type: ${s}, deltaValue: ${r}, accValue: ${a}`);
      e[s] = a;
    }
    return e;
  }
  _addRun(e) {
    return e;
  }
  async _threadAssistantStream(e, t, s) {
    return await this._createThreadAssistantStream(t, e, s);
  }
  async _runAssistantStream(e, t, s, r) {
    return await this._createAssistantStream(t, e, s, r);
  }
  async _runToolAssistantStream(e, t, s, r) {
    return await this._createToolAssistantStream(t, e, s, r);
  }
}
le = Ne, Oe = function(e) {
  if (!this.ended)
    switch (R(this, nt, e), u(this, W, "m", Xs).call(this, e), e.event) {
      case "thread.created":
        break;
      case "thread.run.created":
      case "thread.run.queued":
      case "thread.run.in_progress":
      case "thread.run.requires_action":
      case "thread.run.completed":
      case "thread.run.incomplete":
      case "thread.run.failed":
      case "thread.run.cancelling":
      case "thread.run.cancelled":
      case "thread.run.expired":
        u(this, W, "m", zs).call(this, e);
        break;
      case "thread.run.step.created":
      case "thread.run.step.in_progress":
      case "thread.run.step.delta":
      case "thread.run.step.completed":
      case "thread.run.step.failed":
      case "thread.run.step.cancelled":
      case "thread.run.step.expired":
        u(this, W, "m", Vs).call(this, e);
        break;
      case "thread.message.created":
      case "thread.message.in_progress":
      case "thread.message.delta":
      case "thread.message.completed":
      case "thread.message.incomplete":
        u(this, W, "m", Js).call(this, e);
        break;
      case "error":
        throw new Error("Encountered an error event in event processing - errors should be processed earlier");
    }
}, Fe = function() {
  if (this.ended)
    throw new v("stream has ended, this shouldn't happen");
  if (!u(this, ue, "f"))
    throw Error("Final run has not been received");
  return u(this, ue, "f");
}, Js = function(e) {
  const [t, s] = u(this, W, "m", Gs).call(this, e, u(this, Q, "f"));
  R(this, Q, t), u(this, st, "f")[t.id] = t;
  for (const r of s) {
    const a = t.content[r.index];
    (a == null ? void 0 : a.type) == "text" && this._emit("textCreated", a.text);
  }
  switch (e.event) {
    case "thread.message.created":
      this._emit("messageCreated", e.data);
      break;
    case "thread.message.in_progress":
      break;
    case "thread.message.delta":
      if (this._emit("messageDelta", e.data.delta, t), e.data.delta.content)
        for (const r of e.data.delta.content) {
          if (r.type == "text" && r.text) {
            let a = r.text, i = t.content[r.index];
            if (i && i.type == "text")
              this._emit("textDelta", a, i.text);
            else
              throw Error("The snapshot associated with this text delta is not text or missing");
          }
          if (r.index != u(this, ye, "f")) {
            if (u(this, ce, "f"))
              switch (u(this, ce, "f").type) {
                case "text":
                  this._emit("textDone", u(this, ce, "f").text, u(this, Q, "f"));
                  break;
                case "image_file":
                  this._emit("imageFileDone", u(this, ce, "f").image_file, u(this, Q, "f"));
                  break;
              }
            R(this, ye, r.index);
          }
          R(this, ce, t.content[r.index]);
        }
      break;
    case "thread.message.completed":
    case "thread.message.incomplete":
      if (u(this, ye, "f") !== void 0) {
        const r = e.data.content[u(this, ye, "f")];
        if (r)
          switch (r.type) {
            case "image_file":
              this._emit("imageFileDone", r.image_file, u(this, Q, "f"));
              break;
            case "text":
              this._emit("textDone", r.text, u(this, Q, "f"));
              break;
          }
      }
      u(this, Q, "f") && this._emit("messageDone", e.data), R(this, Q, void 0);
  }
}, Vs = function(e) {
  const t = u(this, W, "m", Ks).call(this, e);
  switch (R(this, Me, t), e.event) {
    case "thread.run.step.created":
      this._emit("runStepCreated", e.data);
      break;
    case "thread.run.step.delta":
      const s = e.data.delta;
      if (s.step_details && s.step_details.type == "tool_calls" && s.step_details.tool_calls && t.step_details.type == "tool_calls")
        for (const a of s.step_details.tool_calls)
          a.index == u(this, gt, "f") ? this._emit("toolCallDelta", a, t.step_details.tool_calls[a.index]) : (u(this, K, "f") && this._emit("toolCallDone", u(this, K, "f")), R(this, gt, a.index), R(this, K, t.step_details.tool_calls[a.index]), u(this, K, "f") && this._emit("toolCallCreated", u(this, K, "f")));
      this._emit("runStepDelta", e.data.delta, t);
      break;
    case "thread.run.step.completed":
    case "thread.run.step.failed":
    case "thread.run.step.cancelled":
    case "thread.run.step.expired":
      R(this, Me, void 0), e.data.step_details.type == "tool_calls" && u(this, K, "f") && (this._emit("toolCallDone", u(this, K, "f")), R(this, K, void 0)), this._emit("runStepDone", e.data, t);
      break;
  }
}, Xs = function(e) {
  u(this, Qt, "f").push(e), this._emit("event", e);
}, Ks = function(e) {
  switch (e.event) {
    case "thread.run.step.created":
      return u(this, Y, "f")[e.data.id] = e.data, e.data;
    case "thread.run.step.delta":
      let t = u(this, Y, "f")[e.data.id];
      if (!t)
        throw Error("Received a RunStepDelta before creation of a snapshot");
      let s = e.data;
      if (s.delta) {
        const r = le.accumulateDelta(t, s.delta);
        u(this, Y, "f")[e.data.id] = r;
      }
      return u(this, Y, "f")[e.data.id];
    case "thread.run.step.completed":
    case "thread.run.step.failed":
    case "thread.run.step.cancelled":
    case "thread.run.step.expired":
    case "thread.run.step.in_progress":
      u(this, Y, "f")[e.data.id] = e.data;
      break;
  }
  if (u(this, Y, "f")[e.data.id])
    return u(this, Y, "f")[e.data.id];
  throw new Error("No snapshot available");
}, Gs = function(e, t) {
  let s = [];
  switch (e.event) {
    case "thread.message.created":
      return [e.data, s];
    case "thread.message.delta":
      if (!t)
        throw Error("Received a delta with no existing snapshot (there should be one from message creation)");
      let r = e.data;
      if (r.delta.content)
        for (const a of r.delta.content)
          if (a.index in t.content) {
            let i = t.content[a.index];
            t.content[a.index] = u(this, W, "m", Qs).call(this, a, i);
          } else
            t.content[a.index] = a, s.push(a);
      return [t, s];
    case "thread.message.in_progress":
    case "thread.message.completed":
    case "thread.message.incomplete":
      if (t)
        return [t, s];
      throw Error("Received thread message event with no existing snapshot");
  }
  throw Error("Tried to accumulate a non-message event");
}, Qs = function(e, t) {
  return le.accumulateDelta(t, e);
}, zs = function(e) {
  switch (R(this, rt, e.data), e.event) {
    case "thread.run.created":
      break;
    case "thread.run.queued":
      break;
    case "thread.run.in_progress":
      break;
    case "thread.run.requires_action":
    case "thread.run.cancelled":
    case "thread.run.failed":
    case "thread.run.completed":
    case "thread.run.expired":
    case "thread.run.incomplete":
      R(this, ue, e.data), u(this, K, "f") && (this._emit("toolCallDone", u(this, K, "f")), R(this, K, void 0));
      break;
  }
};
let fs = class extends x {
  constructor() {
    super(...arguments), this.steps = new ur(this._client);
  }
  create(e, t, s) {
    const { include: r, ...a } = t;
    return this._client.post(f`/threads/${e}/runs`, {
      query: { include: r },
      body: a,
      ...s,
      headers: _([{ "OpenAI-Beta": "assistants=v2" }, s == null ? void 0 : s.headers]),
      stream: t.stream ?? !1
    });
  }
  /**
   * Retrieves a run.
   *
   * @deprecated The Assistants API is deprecated in favor of the Responses API
   */
  retrieve(e, t, s) {
    const { thread_id: r } = t;
    return this._client.get(f`/threads/${r}/runs/${e}`, {
      ...s,
      headers: _([{ "OpenAI-Beta": "assistants=v2" }, s == null ? void 0 : s.headers])
    });
  }
  /**
   * Modifies a run.
   *
   * @deprecated The Assistants API is deprecated in favor of the Responses API
   */
  update(e, t, s) {
    const { thread_id: r, ...a } = t;
    return this._client.post(f`/threads/${r}/runs/${e}`, {
      body: a,
      ...s,
      headers: _([{ "OpenAI-Beta": "assistants=v2" }, s == null ? void 0 : s.headers])
    });
  }
  /**
   * Returns a list of runs belonging to a thread.
   *
   * @deprecated The Assistants API is deprecated in favor of the Responses API
   */
  list(e, t = {}, s) {
    return this._client.getAPIList(f`/threads/${e}/runs`, M, {
      query: t,
      ...s,
      headers: _([{ "OpenAI-Beta": "assistants=v2" }, s == null ? void 0 : s.headers])
    });
  }
  /**
   * Cancels a run that is `in_progress`.
   *
   * @deprecated The Assistants API is deprecated in favor of the Responses API
   */
  cancel(e, t, s) {
    const { thread_id: r } = t;
    return this._client.post(f`/threads/${r}/runs/${e}/cancel`, {
      ...s,
      headers: _([{ "OpenAI-Beta": "assistants=v2" }, s == null ? void 0 : s.headers])
    });
  }
  /**
   * A helper to create a run an poll for a terminal state. More information on Run
   * lifecycles can be found here:
   * https://platform.openai.com/docs/assistants/how-it-works/runs-and-run-steps
   */
  async createAndPoll(e, t, s) {
    const r = await this.create(e, t, s);
    return await this.poll(r.id, { thread_id: e }, s);
  }
  /**
   * Create a Run stream
   *
   * @deprecated use `stream` instead
   */
  createAndStream(e, t, s) {
    return Ne.createAssistantStream(e, this._client.beta.threads.runs, t, s);
  }
  /**
   * A helper to poll a run status until it reaches a terminal state. More
   * information on Run lifecycles can be found here:
   * https://platform.openai.com/docs/assistants/how-it-works/runs-and-run-steps
   */
  async poll(e, t, s) {
    var a;
    const r = _([
      s == null ? void 0 : s.headers,
      {
        "X-Stainless-Poll-Helper": "true",
        "X-Stainless-Custom-Poll-Interval": ((a = s == null ? void 0 : s.pollIntervalMs) == null ? void 0 : a.toString()) ?? void 0
      }
    ]);
    for (; ; ) {
      const { data: i, response: o } = await this.retrieve(e, t, {
        ...s,
        headers: { ...s == null ? void 0 : s.headers, ...r }
      }).withResponse();
      switch (i.status) {
        case "queued":
        case "in_progress":
        case "cancelling":
          let c = 5e3;
          if (s != null && s.pollIntervalMs)
            c = s.pollIntervalMs;
          else {
            const l = o.headers.get("openai-poll-after-ms");
            if (l) {
              const h = parseInt(l);
              isNaN(h) || (c = h);
            }
          }
          await Be(c);
          break;
        case "requires_action":
        case "incomplete":
        case "cancelled":
        case "completed":
        case "failed":
        case "expired":
          return i;
      }
    }
  }
  /**
   * Create a Run stream
   */
  stream(e, t, s) {
    return Ne.createAssistantStream(e, this._client.beta.threads.runs, t, s);
  }
  submitToolOutputs(e, t, s) {
    const { thread_id: r, ...a } = t;
    return this._client.post(f`/threads/${r}/runs/${e}/submit_tool_outputs`, {
      body: a,
      ...s,
      headers: _([{ "OpenAI-Beta": "assistants=v2" }, s == null ? void 0 : s.headers]),
      stream: t.stream ?? !1
    });
  }
  /**
   * A helper to submit a tool output to a run and poll for a terminal run state.
   * More information on Run lifecycles can be found here:
   * https://platform.openai.com/docs/assistants/how-it-works/runs-and-run-steps
   */
  async submitToolOutputsAndPoll(e, t, s) {
    const r = await this.submitToolOutputs(e, t, s);
    return await this.poll(r.id, t, s);
  }
  /**
   * Submit the tool outputs from a previous run and stream the run to a terminal
   * state. More information on Run lifecycles can be found here:
   * https://platform.openai.com/docs/assistants/how-it-works/runs-and-run-steps
   */
  submitToolOutputsStream(e, t, s) {
    return Ne.createToolAssistantStream(e, this._client.beta.threads.runs, t, s);
  }
};
fs.Steps = ur;
class At extends x {
  constructor() {
    super(...arguments), this.runs = new fs(this._client), this.messages = new lr(this._client);
  }
  /**
   * Create a thread.
   *
   * @deprecated The Assistants API is deprecated in favor of the Responses API
   */
  create(e = {}, t) {
    return this._client.post("/threads", {
      body: e,
      ...t,
      headers: _([{ "OpenAI-Beta": "assistants=v2" }, t == null ? void 0 : t.headers])
    });
  }
  /**
   * Retrieves a thread.
   *
   * @deprecated The Assistants API is deprecated in favor of the Responses API
   */
  retrieve(e, t) {
    return this._client.get(f`/threads/${e}`, {
      ...t,
      headers: _([{ "OpenAI-Beta": "assistants=v2" }, t == null ? void 0 : t.headers])
    });
  }
  /**
   * Modifies a thread.
   *
   * @deprecated The Assistants API is deprecated in favor of the Responses API
   */
  update(e, t, s) {
    return this._client.post(f`/threads/${e}`, {
      body: t,
      ...s,
      headers: _([{ "OpenAI-Beta": "assistants=v2" }, s == null ? void 0 : s.headers])
    });
  }
  /**
   * Delete a thread.
   *
   * @deprecated The Assistants API is deprecated in favor of the Responses API
   */
  delete(e, t) {
    return this._client.delete(f`/threads/${e}`, {
      ...t,
      headers: _([{ "OpenAI-Beta": "assistants=v2" }, t == null ? void 0 : t.headers])
    });
  }
  createAndRun(e, t) {
    return this._client.post("/threads/runs", {
      body: e,
      ...t,
      headers: _([{ "OpenAI-Beta": "assistants=v2" }, t == null ? void 0 : t.headers]),
      stream: e.stream ?? !1
    });
  }
  /**
   * A helper to create a thread, start a run and then poll for a terminal state.
   * More information on Run lifecycles can be found here:
   * https://platform.openai.com/docs/assistants/how-it-works/runs-and-run-steps
   */
  async createAndRunPoll(e, t) {
    const s = await this.createAndRun(e, t);
    return await this.runs.poll(s.id, { thread_id: s.thread_id }, t);
  }
  /**
   * Create a thread and stream the run back
   */
  createAndRunStream(e, t) {
    return Ne.createThreadAssistantStream(e, this._client.beta.threads, t);
  }
}
At.Runs = fs;
At.Messages = lr;
class be extends x {
  constructor() {
    super(...arguments), this.realtime = new St(this._client), this.chatkit = new vt(this._client), this.assistants = new rr(this._client), this.threads = new At(this._client);
  }
}
be.Realtime = St;
be.ChatKit = vt;
be.Assistants = rr;
be.Threads = At;
class dr extends x {
  create(e, t) {
    return this._client.post("/completions", { body: e, ...t, stream: e.stream ?? !1 });
  }
}
class hr extends x {
  /**
   * Retrieve Container File Content
   */
  retrieve(e, t, s) {
    const { container_id: r } = t;
    return this._client.get(f`/containers/${r}/files/${e}/content`, {
      ...s,
      headers: _([{ Accept: "application/binary" }, s == null ? void 0 : s.headers]),
      __binaryResponse: !0
    });
  }
}
let ms = class extends x {
  constructor() {
    super(...arguments), this.content = new hr(this._client);
  }
  /**
   * Create a Container File
   *
   * You can send either a multipart/form-data request with the raw file content, or
   * a JSON request with a file ID.
   */
  create(e, t, s) {
    return this._client.post(f`/containers/${e}/files`, he({ body: t, ...s }, this._client));
  }
  /**
   * Retrieve Container File
   */
  retrieve(e, t, s) {
    const { container_id: r } = t;
    return this._client.get(f`/containers/${r}/files/${e}`, s);
  }
  /**
   * List Container files
   */
  list(e, t = {}, s) {
    return this._client.getAPIList(f`/containers/${e}/files`, M, {
      query: t,
      ...s
    });
  }
  /**
   * Delete Container File
   */
  delete(e, t, s) {
    const { container_id: r } = t;
    return this._client.delete(f`/containers/${r}/files/${e}`, {
      ...s,
      headers: _([{ Accept: "*/*" }, s == null ? void 0 : s.headers])
    });
  }
};
ms.Content = hr;
class ps extends x {
  constructor() {
    super(...arguments), this.files = new ms(this._client);
  }
  /**
   * Create Container
   */
  create(e, t) {
    return this._client.post("/containers", { body: e, ...t });
  }
  /**
   * Retrieve Container
   */
  retrieve(e, t) {
    return this._client.get(f`/containers/${e}`, t);
  }
  /**
   * List Containers
   */
  list(e = {}, t) {
    return this._client.getAPIList("/containers", M, { query: e, ...t });
  }
  /**
   * Delete Container
   */
  delete(e, t) {
    return this._client.delete(f`/containers/${e}`, {
      ...t,
      headers: _([{ Accept: "*/*" }, t == null ? void 0 : t.headers])
    });
  }
}
ps.Files = ms;
class fr extends x {
  /**
   * Create items in a conversation with the given ID.
   */
  create(e, t, s) {
    const { include: r, ...a } = t;
    return this._client.post(f`/conversations/${e}/items`, {
      query: { include: r },
      body: a,
      ...s
    });
  }
  /**
   * Get a single item from a conversation with the given IDs.
   */
  retrieve(e, t, s) {
    const { conversation_id: r, ...a } = t;
    return this._client.get(f`/conversations/${r}/items/${e}`, { query: a, ...s });
  }
  /**
   * List all items for a conversation with the given ID.
   */
  list(e, t = {}, s) {
    return this._client.getAPIList(f`/conversations/${e}/items`, lt, { query: t, ...s });
  }
  /**
   * Delete an item from a conversation with the given IDs.
   */
  delete(e, t, s) {
    const { conversation_id: r } = t;
    return this._client.delete(f`/conversations/${r}/items/${e}`, s);
  }
}
class gs extends x {
  constructor() {
    super(...arguments), this.items = new fr(this._client);
  }
  /**
   * Create a conversation.
   */
  create(e = {}, t) {
    return this._client.post("/conversations", { body: e, ...t });
  }
  /**
   * Get a conversation
   */
  retrieve(e, t) {
    return this._client.get(f`/conversations/${e}`, t);
  }
  /**
   * Update a conversation
   */
  update(e, t, s) {
    return this._client.post(f`/conversations/${e}`, { body: t, ...s });
  }
  /**
   * Delete a conversation. Items in the conversation will not be deleted.
   */
  delete(e, t) {
    return this._client.delete(f`/conversations/${e}`, t);
  }
}
gs.Items = fr;
class mr extends x {
  /**
   * Creates an embedding vector representing the input text.
   *
   * @example
   * ```ts
   * const createEmbeddingResponse =
   *   await client.embeddings.create({
   *     input: 'The quick brown fox jumped over the lazy dog',
   *     model: 'text-embedding-3-small',
   *   });
   * ```
   */
  create(e, t) {
    const s = !!e.encoding_format;
    let r = s ? e.encoding_format : "base64";
    s && B(this._client).debug("embeddings/user defined encoding_format:", e.encoding_format);
    const a = this._client.post("/embeddings", {
      body: {
        ...e,
        encoding_format: r
      },
      ...t
    });
    return s ? a : (B(this._client).debug("embeddings/decoding base64 embeddings from base64"), a._thenUnwrap((i) => (i && i.data && i.data.forEach((o) => {
      const c = o.embedding;
      o.embedding = ii(c);
    }), i)));
  }
}
class pr extends x {
  /**
   * Get an evaluation run output item by ID.
   */
  retrieve(e, t, s) {
    const { eval_id: r, run_id: a } = t;
    return this._client.get(f`/evals/${r}/runs/${a}/output_items/${e}`, s);
  }
  /**
   * Get a list of output items for an evaluation run.
   */
  list(e, t, s) {
    const { eval_id: r, ...a } = t;
    return this._client.getAPIList(f`/evals/${r}/runs/${e}/output_items`, M, { query: a, ...s });
  }
}
class _s extends x {
  constructor() {
    super(...arguments), this.outputItems = new pr(this._client);
  }
  /**
   * Kicks off a new run for a given evaluation, specifying the data source, and what
   * model configuration to use to test. The datasource will be validated against the
   * schema specified in the config of the evaluation.
   */
  create(e, t, s) {
    return this._client.post(f`/evals/${e}/runs`, { body: t, ...s });
  }
  /**
   * Get an evaluation run by ID.
   */
  retrieve(e, t, s) {
    const { eval_id: r } = t;
    return this._client.get(f`/evals/${r}/runs/${e}`, s);
  }
  /**
   * Get a list of runs for an evaluation.
   */
  list(e, t = {}, s) {
    return this._client.getAPIList(f`/evals/${e}/runs`, M, {
      query: t,
      ...s
    });
  }
  /**
   * Delete an eval run.
   */
  delete(e, t, s) {
    const { eval_id: r } = t;
    return this._client.delete(f`/evals/${r}/runs/${e}`, s);
  }
  /**
   * Cancel an ongoing evaluation run.
   */
  cancel(e, t, s) {
    const { eval_id: r } = t;
    return this._client.post(f`/evals/${r}/runs/${e}`, s);
  }
}
_s.OutputItems = pr;
class ws extends x {
  constructor() {
    super(...arguments), this.runs = new _s(this._client);
  }
  /**
   * Create the structure of an evaluation that can be used to test a model's
   * performance. An evaluation is a set of testing criteria and the config for a
   * data source, which dictates the schema of the data used in the evaluation. After
   * creating an evaluation, you can run it on different models and model parameters.
   * We support several types of graders and datasources. For more information, see
   * the [Evals guide](https://platform.openai.com/docs/guides/evals).
   */
  create(e, t) {
    return this._client.post("/evals", { body: e, ...t });
  }
  /**
   * Get an evaluation by ID.
   */
  retrieve(e, t) {
    return this._client.get(f`/evals/${e}`, t);
  }
  /**
   * Update certain properties of an evaluation.
   */
  update(e, t, s) {
    return this._client.post(f`/evals/${e}`, { body: t, ...s });
  }
  /**
   * List evaluations for a project.
   */
  list(e = {}, t) {
    return this._client.getAPIList("/evals", M, { query: e, ...t });
  }
  /**
   * Delete an evaluation.
   */
  delete(e, t) {
    return this._client.delete(f`/evals/${e}`, t);
  }
}
ws.Runs = _s;
let gr = class extends x {
  /**
   * Upload a file that can be used across various endpoints. Individual files can be
   * up to 512 MB, and the size of all files uploaded by one organization can be up
   * to 1 TB.
   *
   * - The Assistants API supports files up to 2 million tokens and of specific file
   *   types. See the
   *   [Assistants Tools guide](https://platform.openai.com/docs/assistants/tools)
   *   for details.
   * - The Fine-tuning API only supports `.jsonl` files. The input also has certain
   *   required formats for fine-tuning
   *   [chat](https://platform.openai.com/docs/api-reference/fine-tuning/chat-input)
   *   or
   *   [completions](https://platform.openai.com/docs/api-reference/fine-tuning/completions-input)
   *   models.
   * - The Batch API only supports `.jsonl` files up to 200 MB in size. The input
   *   also has a specific required
   *   [format](https://platform.openai.com/docs/api-reference/batch/request-input).
   *
   * Please [contact us](https://help.openai.com/) if you need to increase these
   * storage limits.
   */
  create(e, t) {
    return this._client.post("/files", he({ body: e, ...t }, this._client));
  }
  /**
   * Returns information about a specific file.
   */
  retrieve(e, t) {
    return this._client.get(f`/files/${e}`, t);
  }
  /**
   * Returns a list of files.
   */
  list(e = {}, t) {
    return this._client.getAPIList("/files", M, { query: e, ...t });
  }
  /**
   * Delete a file and remove it from all vector stores.
   */
  delete(e, t) {
    return this._client.delete(f`/files/${e}`, t);
  }
  /**
   * Returns the contents of the specified file.
   */
  content(e, t) {
    return this._client.get(f`/files/${e}/content`, {
      ...t,
      headers: _([{ Accept: "application/binary" }, t == null ? void 0 : t.headers]),
      __binaryResponse: !0
    });
  }
  /**
   * Waits for the given file to be processed, default timeout is 30 mins.
   */
  async waitForProcessing(e, { pollInterval: t = 5e3, maxWait: s = 30 * 60 * 1e3 } = {}) {
    const r = /* @__PURE__ */ new Set(["processed", "error", "deleted"]), a = Date.now();
    let i = await this.retrieve(e);
    for (; !i.status || !r.has(i.status); )
      if (await Be(t), i = await this.retrieve(e), Date.now() - a > s)
        throw new ns({
          message: `Giving up on waiting for file ${e} to finish processing after ${s} milliseconds.`
        });
    return i;
  }
};
class _r extends x {
}
let wr = class extends x {
  /**
   * Run a grader.
   *
   * @example
   * ```ts
   * const response = await client.fineTuning.alpha.graders.run({
   *   grader: {
   *     input: 'input',
   *     name: 'name',
   *     operation: 'eq',
   *     reference: 'reference',
   *     type: 'string_check',
   *   },
   *   model_sample: 'model_sample',
   * });
   * ```
   */
  run(e, t) {
    return this._client.post("/fine_tuning/alpha/graders/run", { body: e, ...t });
  }
  /**
   * Validate a grader.
   *
   * @example
   * ```ts
   * const response =
   *   await client.fineTuning.alpha.graders.validate({
   *     grader: {
   *       input: 'input',
   *       name: 'name',
   *       operation: 'eq',
   *       reference: 'reference',
   *       type: 'string_check',
   *     },
   *   });
   * ```
   */
  validate(e, t) {
    return this._client.post("/fine_tuning/alpha/graders/validate", { body: e, ...t });
  }
};
class ys extends x {
  constructor() {
    super(...arguments), this.graders = new wr(this._client);
  }
}
ys.Graders = wr;
class yr extends x {
  /**
   * **NOTE:** Calling this endpoint requires an [admin API key](../admin-api-keys).
   *
   * This enables organization owners to share fine-tuned models with other projects
   * in their organization.
   *
   * @example
   * ```ts
   * // Automatically fetches more pages as needed.
   * for await (const permissionCreateResponse of client.fineTuning.checkpoints.permissions.create(
   *   'ft:gpt-4o-mini-2024-07-18:org:weather:B7R9VjQd',
   *   { project_ids: ['string'] },
   * )) {
   *   // ...
   * }
   * ```
   */
  create(e, t, s) {
    return this._client.getAPIList(f`/fine_tuning/checkpoints/${e}/permissions`, xt, { body: t, method: "post", ...s });
  }
  /**
   * **NOTE:** This endpoint requires an [admin API key](../admin-api-keys).
   *
   * Organization owners can use this endpoint to view all permissions for a
   * fine-tuned model checkpoint.
   *
   * @example
   * ```ts
   * const permission =
   *   await client.fineTuning.checkpoints.permissions.retrieve(
   *     'ft-AF1WoRqd3aJAHsqc9NY7iL8F',
   *   );
   * ```
   */
  retrieve(e, t = {}, s) {
    return this._client.get(f`/fine_tuning/checkpoints/${e}/permissions`, {
      query: t,
      ...s
    });
  }
  /**
   * **NOTE:** This endpoint requires an [admin API key](../admin-api-keys).
   *
   * Organization owners can use this endpoint to delete a permission for a
   * fine-tuned model checkpoint.
   *
   * @example
   * ```ts
   * const permission =
   *   await client.fineTuning.checkpoints.permissions.delete(
   *     'cp_zc4Q7MP6XxulcVzj4MZdwsAB',
   *     {
   *       fine_tuned_model_checkpoint:
   *         'ft:gpt-4o-mini-2024-07-18:org:weather:B7R9VjQd',
   *     },
   *   );
   * ```
   */
  delete(e, t, s) {
    const { fine_tuned_model_checkpoint: r } = t;
    return this._client.delete(f`/fine_tuning/checkpoints/${r}/permissions/${e}`, s);
  }
}
let bs = class extends x {
  constructor() {
    super(...arguments), this.permissions = new yr(this._client);
  }
};
bs.Permissions = yr;
class br extends x {
  /**
   * List checkpoints for a fine-tuning job.
   *
   * @example
   * ```ts
   * // Automatically fetches more pages as needed.
   * for await (const fineTuningJobCheckpoint of client.fineTuning.jobs.checkpoints.list(
   *   'ft-AF1WoRqd3aJAHsqc9NY7iL8F',
   * )) {
   *   // ...
   * }
   * ```
   */
  list(e, t = {}, s) {
    return this._client.getAPIList(f`/fine_tuning/jobs/${e}/checkpoints`, M, { query: t, ...s });
  }
}
class xs extends x {
  constructor() {
    super(...arguments), this.checkpoints = new br(this._client);
  }
  /**
   * Creates a fine-tuning job which begins the process of creating a new model from
   * a given dataset.
   *
   * Response includes details of the enqueued job including job status and the name
   * of the fine-tuned models once complete.
   *
   * [Learn more about fine-tuning](https://platform.openai.com/docs/guides/model-optimization)
   *
   * @example
   * ```ts
   * const fineTuningJob = await client.fineTuning.jobs.create({
   *   model: 'gpt-4o-mini',
   *   training_file: 'file-abc123',
   * });
   * ```
   */
  create(e, t) {
    return this._client.post("/fine_tuning/jobs", { body: e, ...t });
  }
  /**
   * Get info about a fine-tuning job.
   *
   * [Learn more about fine-tuning](https://platform.openai.com/docs/guides/model-optimization)
   *
   * @example
   * ```ts
   * const fineTuningJob = await client.fineTuning.jobs.retrieve(
   *   'ft-AF1WoRqd3aJAHsqc9NY7iL8F',
   * );
   * ```
   */
  retrieve(e, t) {
    return this._client.get(f`/fine_tuning/jobs/${e}`, t);
  }
  /**
   * List your organization's fine-tuning jobs
   *
   * @example
   * ```ts
   * // Automatically fetches more pages as needed.
   * for await (const fineTuningJob of client.fineTuning.jobs.list()) {
   *   // ...
   * }
   * ```
   */
  list(e = {}, t) {
    return this._client.getAPIList("/fine_tuning/jobs", M, { query: e, ...t });
  }
  /**
   * Immediately cancel a fine-tune job.
   *
   * @example
   * ```ts
   * const fineTuningJob = await client.fineTuning.jobs.cancel(
   *   'ft-AF1WoRqd3aJAHsqc9NY7iL8F',
   * );
   * ```
   */
  cancel(e, t) {
    return this._client.post(f`/fine_tuning/jobs/${e}/cancel`, t);
  }
  /**
   * Get status updates for a fine-tuning job.
   *
   * @example
   * ```ts
   * // Automatically fetches more pages as needed.
   * for await (const fineTuningJobEvent of client.fineTuning.jobs.listEvents(
   *   'ft-AF1WoRqd3aJAHsqc9NY7iL8F',
   * )) {
   *   // ...
   * }
   * ```
   */
  listEvents(e, t = {}, s) {
    return this._client.getAPIList(f`/fine_tuning/jobs/${e}/events`, M, { query: t, ...s });
  }
  /**
   * Pause a fine-tune job.
   *
   * @example
   * ```ts
   * const fineTuningJob = await client.fineTuning.jobs.pause(
   *   'ft-AF1WoRqd3aJAHsqc9NY7iL8F',
   * );
   * ```
   */
  pause(e, t) {
    return this._client.post(f`/fine_tuning/jobs/${e}/pause`, t);
  }
  /**
   * Resume a fine-tune job.
   *
   * @example
   * ```ts
   * const fineTuningJob = await client.fineTuning.jobs.resume(
   *   'ft-AF1WoRqd3aJAHsqc9NY7iL8F',
   * );
   * ```
   */
  resume(e, t) {
    return this._client.post(f`/fine_tuning/jobs/${e}/resume`, t);
  }
}
xs.Checkpoints = br;
class xe extends x {
  constructor() {
    super(...arguments), this.methods = new _r(this._client), this.jobs = new xs(this._client), this.checkpoints = new bs(this._client), this.alpha = new ys(this._client);
  }
}
xe.Methods = _r;
xe.Jobs = xs;
xe.Checkpoints = bs;
xe.Alpha = ys;
class xr extends x {
}
class Ss extends x {
  constructor() {
    super(...arguments), this.graderModels = new xr(this._client);
  }
}
Ss.GraderModels = xr;
class Sr extends x {
  /**
   * Creates a variation of a given image. This endpoint only supports `dall-e-2`.
   *
   * @example
   * ```ts
   * const imagesResponse = await client.images.createVariation({
   *   image: fs.createReadStream('otter.png'),
   * });
   * ```
   */
  createVariation(e, t) {
    return this._client.post("/images/variations", he({ body: e, ...t }, this._client));
  }
  edit(e, t) {
    return this._client.post("/images/edits", he({ body: e, ...t, stream: e.stream ?? !1 }, this._client));
  }
  generate(e, t) {
    return this._client.post("/images/generations", { body: e, ...t, stream: e.stream ?? !1 });
  }
}
class vr extends x {
  /**
   * Retrieves a model instance, providing basic information about the model such as
   * the owner and permissioning.
   */
  retrieve(e, t) {
    return this._client.get(f`/models/${e}`, t);
  }
  /**
   * Lists the currently available models, and provides basic information about each
   * one such as the owner and availability.
   */
  list(e) {
    return this._client.getAPIList("/models", xt, e);
  }
  /**
   * Delete a fine-tuned model. You must have the Owner role in your organization to
   * delete a model.
   */
  delete(e, t) {
    return this._client.delete(f`/models/${e}`, t);
  }
}
class Ar extends x {
  /**
   * Classifies if text and/or image inputs are potentially harmful. Learn more in
   * the [moderation guide](https://platform.openai.com/docs/guides/moderation).
   */
  create(e, t) {
    return this._client.post("/moderations", { body: e, ...t });
  }
}
class Rr extends x {
  /**
   * Accept an incoming SIP call and configure the realtime session that will handle
   * it.
   *
   * @example
   * ```ts
   * await client.realtime.calls.accept('call_id', {
   *   type: 'realtime',
   * });
   * ```
   */
  accept(e, t, s) {
    return this._client.post(f`/realtime/calls/${e}/accept`, {
      body: t,
      ...s,
      headers: _([{ Accept: "*/*" }, s == null ? void 0 : s.headers])
    });
  }
  /**
   * End an active Realtime API call, whether it was initiated over SIP or WebRTC.
   *
   * @example
   * ```ts
   * await client.realtime.calls.hangup('call_id');
   * ```
   */
  hangup(e, t) {
    return this._client.post(f`/realtime/calls/${e}/hangup`, {
      ...t,
      headers: _([{ Accept: "*/*" }, t == null ? void 0 : t.headers])
    });
  }
  /**
   * Transfer an active SIP call to a new destination using the SIP REFER verb.
   *
   * @example
   * ```ts
   * await client.realtime.calls.refer('call_id', {
   *   target_uri: 'tel:+14155550123',
   * });
   * ```
   */
  refer(e, t, s) {
    return this._client.post(f`/realtime/calls/${e}/refer`, {
      body: t,
      ...s,
      headers: _([{ Accept: "*/*" }, s == null ? void 0 : s.headers])
    });
  }
  /**
   * Decline an incoming SIP call by returning a SIP status code to the caller.
   *
   * @example
   * ```ts
   * await client.realtime.calls.reject('call_id');
   * ```
   */
  reject(e, t = {}, s) {
    return this._client.post(f`/realtime/calls/${e}/reject`, {
      body: t,
      ...s,
      headers: _([{ Accept: "*/*" }, s == null ? void 0 : s.headers])
    });
  }
}
class $r extends x {
  /**
   * Create a Realtime client secret with an associated session configuration.
   *
   * @example
   * ```ts
   * const clientSecret =
   *   await client.realtime.clientSecrets.create();
   * ```
   */
  create(e, t) {
    return this._client.post("/realtime/client_secrets", { body: e, ...t });
  }
}
class Rt extends x {
  constructor() {
    super(...arguments), this.clientSecrets = new $r(this._client), this.calls = new Rr(this._client);
  }
}
Rt.ClientSecrets = $r;
Rt.Calls = Rr;
function oi(n, e) {
  return !e || !li(e) ? {
    ...n,
    output_parsed: null,
    output: n.output.map((t) => t.type === "function_call" ? {
      ...t,
      parsed_arguments: null
    } : t.type === "message" ? {
      ...t,
      content: t.content.map((s) => ({
        ...s,
        parsed: null
      }))
    } : t)
  } : Cr(n, e);
}
function Cr(n, e) {
  const t = n.output.map((r) => {
    if (r.type === "function_call")
      return {
        ...r,
        parsed_arguments: hi(e, r)
      };
    if (r.type === "message") {
      const a = r.content.map((i) => i.type === "output_text" ? {
        ...i,
        parsed: ci(e, i.text)
      } : i);
      return {
        ...r,
        content: a
      };
    }
    return r;
  }), s = Object.assign({}, n, { output: t });
  return Object.getOwnPropertyDescriptor(n, "output_text") || zt(s), Object.defineProperty(s, "output_parsed", {
    enumerable: !0,
    get() {
      for (const r of s.output)
        if (r.type === "message") {
          for (const a of r.content)
            if (a.type === "output_text" && a.parsed !== null)
              return a.parsed;
        }
      return null;
    }
  }), s;
}
function ci(n, e) {
  var t, s, r, a;
  return ((s = (t = n.text) == null ? void 0 : t.format) == null ? void 0 : s.type) !== "json_schema" ? null : "$parseRaw" in ((r = n.text) == null ? void 0 : r.format) ? ((a = n.text) == null ? void 0 : a.format).$parseRaw(e) : JSON.parse(e);
}
function li(n) {
  var e;
  return !!os((e = n.text) == null ? void 0 : e.format);
}
function ui(n) {
  return (n == null ? void 0 : n.$brand) === "auto-parseable-tool";
}
function di(n, e) {
  return n.find((t) => t.type === "function" && t.name === e);
}
function hi(n, e) {
  const t = di(n.tools ?? [], e.name);
  return {
    ...e,
    ...e,
    parsed_arguments: ui(t) ? t.$parseRaw(e.arguments) : t != null && t.strict ? JSON.parse(e.arguments) : null
  };
}
function zt(n) {
  const e = [];
  for (const t of n.output)
    if (t.type === "message")
      for (const s of t.content)
        s.type === "output_text" && e.push(s.text);
  n.output_text = e.join("");
}
var pe, Qe, re, ze, Ys, Zs, en, tn;
class vs extends ls {
  constructor(e) {
    super(), pe.add(this), Qe.set(this, void 0), re.set(this, void 0), ze.set(this, void 0), R(this, Qe, e);
  }
  static createResponse(e, t, s) {
    const r = new vs(t);
    return r._run(() => r._createOrRetrieveResponse(e, t, {
      ...s,
      headers: { ...s == null ? void 0 : s.headers, "X-Stainless-Helper-Method": "stream" }
    })), r;
  }
  async _createOrRetrieveResponse(e, t, s) {
    var o;
    const r = s == null ? void 0 : s.signal;
    r && (r.aborted && this.controller.abort(), r.addEventListener("abort", () => this.controller.abort())), u(this, pe, "m", Ys).call(this);
    let a, i = null;
    "response_id" in t ? (a = await e.responses.retrieve(t.response_id, { stream: !0 }, { ...s, signal: this.controller.signal, stream: !0 }), i = t.starting_after ?? null) : a = await e.responses.create({ ...t, stream: !0 }, { ...s, signal: this.controller.signal }), this._connected();
    for await (const c of a)
      u(this, pe, "m", Zs).call(this, c, i);
    if ((o = a.controller.signal) != null && o.aborted)
      throw new G();
    return u(this, pe, "m", en).call(this);
  }
  [(Qe = /* @__PURE__ */ new WeakMap(), re = /* @__PURE__ */ new WeakMap(), ze = /* @__PURE__ */ new WeakMap(), pe = /* @__PURE__ */ new WeakSet(), Ys = function() {
    this.ended || R(this, re, void 0);
  }, Zs = function(t, s) {
    if (this.ended)
      return;
    const r = (i, o) => {
      (s == null || o.sequence_number > s) && this._emit(i, o);
    }, a = u(this, pe, "m", tn).call(this, t);
    switch (r("event", t), t.type) {
      case "response.output_text.delta": {
        const i = a.output[t.output_index];
        if (!i)
          throw new v(`missing output at index ${t.output_index}`);
        if (i.type === "message") {
          const o = i.content[t.content_index];
          if (!o)
            throw new v(`missing content at index ${t.content_index}`);
          if (o.type !== "output_text")
            throw new v(`expected content to be 'output_text', got ${o.type}`);
          r("response.output_text.delta", {
            ...t,
            snapshot: o.text
          });
        }
        break;
      }
      case "response.function_call_arguments.delta": {
        const i = a.output[t.output_index];
        if (!i)
          throw new v(`missing output at index ${t.output_index}`);
        i.type === "function_call" && r("response.function_call_arguments.delta", {
          ...t,
          snapshot: i.arguments
        });
        break;
      }
      default:
        r(t.type, t);
        break;
    }
  }, en = function() {
    if (this.ended)
      throw new v("stream has ended, this shouldn't happen");
    const t = u(this, re, "f");
    if (!t)
      throw new v("request ended without sending any events");
    R(this, re, void 0);
    const s = fi(t, u(this, Qe, "f"));
    return R(this, ze, s), s;
  }, tn = function(t) {
    var r;
    let s = u(this, re, "f");
    if (!s) {
      if (t.type !== "response.created")
        throw new v(`When snapshot hasn't been set yet, expected 'response.created' event, got ${t.type}`);
      return s = R(this, re, t.response), s;
    }
    switch (t.type) {
      case "response.output_item.added": {
        s.output.push(t.item);
        break;
      }
      case "response.content_part.added": {
        const a = s.output[t.output_index];
        if (!a)
          throw new v(`missing output at index ${t.output_index}`);
        const i = a.type, o = t.part;
        i === "message" && o.type !== "reasoning_text" ? a.content.push(o) : i === "reasoning" && o.type === "reasoning_text" && (a.content || (a.content = []), a.content.push(o));
        break;
      }
      case "response.output_text.delta": {
        const a = s.output[t.output_index];
        if (!a)
          throw new v(`missing output at index ${t.output_index}`);
        if (a.type === "message") {
          const i = a.content[t.content_index];
          if (!i)
            throw new v(`missing content at index ${t.content_index}`);
          if (i.type !== "output_text")
            throw new v(`expected content to be 'output_text', got ${i.type}`);
          i.text += t.delta;
        }
        break;
      }
      case "response.function_call_arguments.delta": {
        const a = s.output[t.output_index];
        if (!a)
          throw new v(`missing output at index ${t.output_index}`);
        a.type === "function_call" && (a.arguments += t.delta);
        break;
      }
      case "response.reasoning_text.delta": {
        const a = s.output[t.output_index];
        if (!a)
          throw new v(`missing output at index ${t.output_index}`);
        if (a.type === "reasoning") {
          const i = (r = a.content) == null ? void 0 : r[t.content_index];
          if (!i)
            throw new v(`missing content at index ${t.content_index}`);
          if (i.type !== "reasoning_text")
            throw new v(`expected content to be 'reasoning_text', got ${i.type}`);
          i.text += t.delta;
        }
        break;
      }
      case "response.completed": {
        R(this, re, t.response);
        break;
      }
    }
    return s;
  }, Symbol.asyncIterator)]() {
    const e = [], t = [];
    let s = !1;
    return this.on("event", (r) => {
      const a = t.shift();
      a ? a.resolve(r) : e.push(r);
    }), this.on("end", () => {
      s = !0;
      for (const r of t)
        r.resolve(void 0);
      t.length = 0;
    }), this.on("abort", (r) => {
      s = !0;
      for (const a of t)
        a.reject(r);
      t.length = 0;
    }), this.on("error", (r) => {
      s = !0;
      for (const a of t)
        a.reject(r);
      t.length = 0;
    }), {
      next: async () => e.length ? { value: e.shift(), done: !1 } : s ? { value: void 0, done: !0 } : new Promise((a, i) => t.push({ resolve: a, reject: i })).then((a) => a ? { value: a, done: !1 } : { value: void 0, done: !0 }),
      return: async () => (this.abort(), { value: void 0, done: !0 })
    };
  }
  /**
   * @returns a promise that resolves with the final Response, or rejects
   * if an error occurred or the stream ended prematurely without producing a REsponse.
   */
  async finalResponse() {
    await this.done();
    const e = u(this, ze, "f");
    if (!e)
      throw new v("stream ended without producing a ChatCompletion");
    return e;
  }
}
function fi(n, e) {
  return oi(n, e);
}
class Pr extends x {
  /**
   * Returns a list of input items for a given response.
   *
   * @example
   * ```ts
   * // Automatically fetches more pages as needed.
   * for await (const responseItem of client.responses.inputItems.list(
   *   'response_id',
   * )) {
   *   // ...
   * }
   * ```
   */
  list(e, t = {}, s) {
    return this._client.getAPIList(f`/responses/${e}/input_items`, M, { query: t, ...s });
  }
}
class Ir extends x {
  /**
   * Get input token counts
   *
   * @example
   * ```ts
   * const response = await client.responses.inputTokens.count();
   * ```
   */
  count(e = {}, t) {
    return this._client.post("/responses/input_tokens", { body: e, ...t });
  }
}
class $t extends x {
  constructor() {
    super(...arguments), this.inputItems = new Pr(this._client), this.inputTokens = new Ir(this._client);
  }
  create(e, t) {
    return this._client.post("/responses", { body: e, ...t, stream: e.stream ?? !1 })._thenUnwrap((s) => ("object" in s && s.object === "response" && zt(s), s));
  }
  retrieve(e, t = {}, s) {
    return this._client.get(f`/responses/${e}`, {
      query: t,
      ...s,
      stream: (t == null ? void 0 : t.stream) ?? !1
    })._thenUnwrap((r) => ("object" in r && r.object === "response" && zt(r), r));
  }
  /**
   * Deletes a model response with the given ID.
   *
   * @example
   * ```ts
   * await client.responses.delete(
   *   'resp_677efb5139a88190b512bc3fef8e535d',
   * );
   * ```
   */
  delete(e, t) {
    return this._client.delete(f`/responses/${e}`, {
      ...t,
      headers: _([{ Accept: "*/*" }, t == null ? void 0 : t.headers])
    });
  }
  parse(e, t) {
    return this._client.responses.create(e, t)._thenUnwrap((s) => Cr(s, e));
  }
  /**
   * Creates a model response stream
   */
  stream(e, t) {
    return vs.createResponse(this._client, e, t);
  }
  /**
   * Cancels a model response with the given ID. Only responses created with the
   * `background` parameter set to `true` can be cancelled.
   * [Learn more](https://platform.openai.com/docs/guides/background).
   *
   * @example
   * ```ts
   * const response = await client.responses.cancel(
   *   'resp_677efb5139a88190b512bc3fef8e535d',
   * );
   * ```
   */
  cancel(e, t) {
    return this._client.post(f`/responses/${e}/cancel`, t);
  }
}
$t.InputItems = Pr;
$t.InputTokens = Ir;
class Er extends x {
  /**
   * Adds a
   * [Part](https://platform.openai.com/docs/api-reference/uploads/part-object) to an
   * [Upload](https://platform.openai.com/docs/api-reference/uploads/object) object.
   * A Part represents a chunk of bytes from the file you are trying to upload.
   *
   * Each Part can be at most 64 MB, and you can add Parts until you hit the Upload
   * maximum of 8 GB.
   *
   * It is possible to add multiple Parts in parallel. You can decide the intended
   * order of the Parts when you
   * [complete the Upload](https://platform.openai.com/docs/api-reference/uploads/complete).
   */
  create(e, t, s) {
    return this._client.post(f`/uploads/${e}/parts`, he({ body: t, ...s }, this._client));
  }
}
class As extends x {
  constructor() {
    super(...arguments), this.parts = new Er(this._client);
  }
  /**
   * Creates an intermediate
   * [Upload](https://platform.openai.com/docs/api-reference/uploads/object) object
   * that you can add
   * [Parts](https://platform.openai.com/docs/api-reference/uploads/part-object) to.
   * Currently, an Upload can accept at most 8 GB in total and expires after an hour
   * after you create it.
   *
   * Once you complete the Upload, we will create a
   * [File](https://platform.openai.com/docs/api-reference/files/object) object that
   * contains all the parts you uploaded. This File is usable in the rest of our
   * platform as a regular File object.
   *
   * For certain `purpose` values, the correct `mime_type` must be specified. Please
   * refer to documentation for the
   * [supported MIME types for your use case](https://platform.openai.com/docs/assistants/tools/file-search#supported-files).
   *
   * For guidance on the proper filename extensions for each purpose, please follow
   * the documentation on
   * [creating a File](https://platform.openai.com/docs/api-reference/files/create).
   */
  create(e, t) {
    return this._client.post("/uploads", { body: e, ...t });
  }
  /**
   * Cancels the Upload. No Parts may be added after an Upload is cancelled.
   */
  cancel(e, t) {
    return this._client.post(f`/uploads/${e}/cancel`, t);
  }
  /**
   * Completes the
   * [Upload](https://platform.openai.com/docs/api-reference/uploads/object).
   *
   * Within the returned Upload object, there is a nested
   * [File](https://platform.openai.com/docs/api-reference/files/object) object that
   * is ready to use in the rest of the platform.
   *
   * You can specify the order of the Parts by passing in an ordered list of the Part
   * IDs.
   *
   * The number of bytes uploaded upon completion must match the number of bytes
   * initially specified when creating the Upload object. No Parts may be added after
   * an Upload is completed.
   */
  complete(e, t, s) {
    return this._client.post(f`/uploads/${e}/complete`, { body: t, ...s });
  }
}
As.Parts = Er;
const mi = async (n) => {
  const e = await Promise.allSettled(n), t = e.filter((r) => r.status === "rejected");
  if (t.length) {
    for (const r of t)
      console.error(r.reason);
    throw new Error(`${t.length} promise(s) failed - see the above errors`);
  }
  const s = [];
  for (const r of e)
    r.status === "fulfilled" && s.push(r.value);
  return s;
};
class kr extends x {
  /**
   * Create a vector store file batch.
   */
  create(e, t, s) {
    return this._client.post(f`/vector_stores/${e}/file_batches`, {
      body: t,
      ...s,
      headers: _([{ "OpenAI-Beta": "assistants=v2" }, s == null ? void 0 : s.headers])
    });
  }
  /**
   * Retrieves a vector store file batch.
   */
  retrieve(e, t, s) {
    const { vector_store_id: r } = t;
    return this._client.get(f`/vector_stores/${r}/file_batches/${e}`, {
      ...s,
      headers: _([{ "OpenAI-Beta": "assistants=v2" }, s == null ? void 0 : s.headers])
    });
  }
  /**
   * Cancel a vector store file batch. This attempts to cancel the processing of
   * files in this batch as soon as possible.
   */
  cancel(e, t, s) {
    const { vector_store_id: r } = t;
    return this._client.post(f`/vector_stores/${r}/file_batches/${e}/cancel`, {
      ...s,
      headers: _([{ "OpenAI-Beta": "assistants=v2" }, s == null ? void 0 : s.headers])
    });
  }
  /**
   * Create a vector store batch and poll until all files have been processed.
   */
  async createAndPoll(e, t, s) {
    const r = await this.create(e, t);
    return await this.poll(e, r.id, s);
  }
  /**
   * Returns a list of vector store files in a batch.
   */
  listFiles(e, t, s) {
    const { vector_store_id: r, ...a } = t;
    return this._client.getAPIList(f`/vector_stores/${r}/file_batches/${e}/files`, M, { query: a, ...s, headers: _([{ "OpenAI-Beta": "assistants=v2" }, s == null ? void 0 : s.headers]) });
  }
  /**
   * Wait for the given file batch to be processed.
   *
   * Note: this will return even if one of the files failed to process, you need to
   * check batch.file_counts.failed_count to handle this case.
   */
  async poll(e, t, s) {
    var a;
    const r = _([
      s == null ? void 0 : s.headers,
      {
        "X-Stainless-Poll-Helper": "true",
        "X-Stainless-Custom-Poll-Interval": ((a = s == null ? void 0 : s.pollIntervalMs) == null ? void 0 : a.toString()) ?? void 0
      }
    ]);
    for (; ; ) {
      const { data: i, response: o } = await this.retrieve(t, { vector_store_id: e }, {
        ...s,
        headers: r
      }).withResponse();
      switch (i.status) {
        case "in_progress":
          let c = 5e3;
          if (s != null && s.pollIntervalMs)
            c = s.pollIntervalMs;
          else {
            const l = o.headers.get("openai-poll-after-ms");
            if (l) {
              const h = parseInt(l);
              isNaN(h) || (c = h);
            }
          }
          await Be(c);
          break;
        case "failed":
        case "cancelled":
        case "completed":
          return i;
      }
    }
  }
  /**
   * Uploads the given files concurrently and then creates a vector store file batch.
   *
   * The concurrency limit is configurable using the `maxConcurrency` parameter.
   */
  async uploadAndPoll(e, { files: t, fileIds: s = [] }, r) {
    if (t == null || t.length == 0)
      throw new Error("No `files` provided to process. If you've already uploaded files you should use `.createAndPoll()` instead");
    const a = (r == null ? void 0 : r.maxConcurrency) ?? 5, i = Math.min(a, t.length), o = this._client, c = t.values(), l = [...s];
    async function h(p) {
      for (let m of p) {
        const g = await o.files.create({ file: m, purpose: "assistants" }, r);
        l.push(g.id);
      }
    }
    const d = Array(i).fill(c).map(h);
    return await mi(d), await this.createAndPoll(e, {
      file_ids: l
    });
  }
}
class Or extends x {
  /**
   * Create a vector store file by attaching a
   * [File](https://platform.openai.com/docs/api-reference/files) to a
   * [vector store](https://platform.openai.com/docs/api-reference/vector-stores/object).
   */
  create(e, t, s) {
    return this._client.post(f`/vector_stores/${e}/files`, {
      body: t,
      ...s,
      headers: _([{ "OpenAI-Beta": "assistants=v2" }, s == null ? void 0 : s.headers])
    });
  }
  /**
   * Retrieves a vector store file.
   */
  retrieve(e, t, s) {
    const { vector_store_id: r } = t;
    return this._client.get(f`/vector_stores/${r}/files/${e}`, {
      ...s,
      headers: _([{ "OpenAI-Beta": "assistants=v2" }, s == null ? void 0 : s.headers])
    });
  }
  /**
   * Update attributes on a vector store file.
   */
  update(e, t, s) {
    const { vector_store_id: r, ...a } = t;
    return this._client.post(f`/vector_stores/${r}/files/${e}`, {
      body: a,
      ...s,
      headers: _([{ "OpenAI-Beta": "assistants=v2" }, s == null ? void 0 : s.headers])
    });
  }
  /**
   * Returns a list of vector store files.
   */
  list(e, t = {}, s) {
    return this._client.getAPIList(f`/vector_stores/${e}/files`, M, {
      query: t,
      ...s,
      headers: _([{ "OpenAI-Beta": "assistants=v2" }, s == null ? void 0 : s.headers])
    });
  }
  /**
   * Delete a vector store file. This will remove the file from the vector store but
   * the file itself will not be deleted. To delete the file, use the
   * [delete file](https://platform.openai.com/docs/api-reference/files/delete)
   * endpoint.
   */
  delete(e, t, s) {
    const { vector_store_id: r } = t;
    return this._client.delete(f`/vector_stores/${r}/files/${e}`, {
      ...s,
      headers: _([{ "OpenAI-Beta": "assistants=v2" }, s == null ? void 0 : s.headers])
    });
  }
  /**
   * Attach a file to the given vector store and wait for it to be processed.
   */
  async createAndPoll(e, t, s) {
    const r = await this.create(e, t, s);
    return await this.poll(e, r.id, s);
  }
  /**
   * Wait for the vector store file to finish processing.
   *
   * Note: this will return even if the file failed to process, you need to check
   * file.last_error and file.status to handle these cases
   */
  async poll(e, t, s) {
    var a;
    const r = _([
      s == null ? void 0 : s.headers,
      {
        "X-Stainless-Poll-Helper": "true",
        "X-Stainless-Custom-Poll-Interval": ((a = s == null ? void 0 : s.pollIntervalMs) == null ? void 0 : a.toString()) ?? void 0
      }
    ]);
    for (; ; ) {
      const i = await this.retrieve(t, {
        vector_store_id: e
      }, { ...s, headers: r }).withResponse(), o = i.data;
      switch (o.status) {
        case "in_progress":
          let c = 5e3;
          if (s != null && s.pollIntervalMs)
            c = s.pollIntervalMs;
          else {
            const l = i.response.headers.get("openai-poll-after-ms");
            if (l) {
              const h = parseInt(l);
              isNaN(h) || (c = h);
            }
          }
          await Be(c);
          break;
        case "failed":
        case "completed":
          return o;
      }
    }
  }
  /**
   * Upload a file to the `files` API and then attach it to the given vector store.
   *
   * Note the file will be asynchronously processed (you can use the alternative
   * polling helper method to wait for processing to complete).
   */
  async upload(e, t, s) {
    const r = await this._client.files.create({ file: t, purpose: "assistants" }, s);
    return this.create(e, { file_id: r.id }, s);
  }
  /**
   * Add a file to a vector store and poll until processing is complete.
   */
  async uploadAndPoll(e, t, s) {
    const r = await this.upload(e, t, s);
    return await this.poll(e, r.id, s);
  }
  /**
   * Retrieve the parsed contents of a vector store file.
   */
  content(e, t, s) {
    const { vector_store_id: r } = t;
    return this._client.getAPIList(f`/vector_stores/${r}/files/${e}/content`, xt, { ...s, headers: _([{ "OpenAI-Beta": "assistants=v2" }, s == null ? void 0 : s.headers]) });
  }
}
class Ct extends x {
  constructor() {
    super(...arguments), this.files = new Or(this._client), this.fileBatches = new kr(this._client);
  }
  /**
   * Create a vector store.
   */
  create(e, t) {
    return this._client.post("/vector_stores", {
      body: e,
      ...t,
      headers: _([{ "OpenAI-Beta": "assistants=v2" }, t == null ? void 0 : t.headers])
    });
  }
  /**
   * Retrieves a vector store.
   */
  retrieve(e, t) {
    return this._client.get(f`/vector_stores/${e}`, {
      ...t,
      headers: _([{ "OpenAI-Beta": "assistants=v2" }, t == null ? void 0 : t.headers])
    });
  }
  /**
   * Modifies a vector store.
   */
  update(e, t, s) {
    return this._client.post(f`/vector_stores/${e}`, {
      body: t,
      ...s,
      headers: _([{ "OpenAI-Beta": "assistants=v2" }, s == null ? void 0 : s.headers])
    });
  }
  /**
   * Returns a list of vector stores.
   */
  list(e = {}, t) {
    return this._client.getAPIList("/vector_stores", M, {
      query: e,
      ...t,
      headers: _([{ "OpenAI-Beta": "assistants=v2" }, t == null ? void 0 : t.headers])
    });
  }
  /**
   * Delete a vector store.
   */
  delete(e, t) {
    return this._client.delete(f`/vector_stores/${e}`, {
      ...t,
      headers: _([{ "OpenAI-Beta": "assistants=v2" }, t == null ? void 0 : t.headers])
    });
  }
  /**
   * Search a vector store for relevant chunks based on a query and file attributes
   * filter.
   */
  search(e, t, s) {
    return this._client.getAPIList(f`/vector_stores/${e}/search`, xt, {
      body: t,
      method: "post",
      ...s,
      headers: _([{ "OpenAI-Beta": "assistants=v2" }, s == null ? void 0 : s.headers])
    });
  }
}
Ct.Files = Or;
Ct.FileBatches = kr;
class Fr extends x {
  /**
   * Create a video
   */
  create(e, t) {
    return this._client.post("/videos", Ws({ body: e, ...t }, this._client));
  }
  /**
   * Retrieve a video
   */
  retrieve(e, t) {
    return this._client.get(f`/videos/${e}`, t);
  }
  /**
   * List videos
   */
  list(e = {}, t) {
    return this._client.getAPIList("/videos", lt, { query: e, ...t });
  }
  /**
   * Delete a video
   */
  delete(e, t) {
    return this._client.delete(f`/videos/${e}`, t);
  }
  /**
   * Download video content
   */
  downloadContent(e, t = {}, s) {
    return this._client.get(f`/videos/${e}/content`, {
      query: t,
      ...s,
      headers: _([{ Accept: "application/binary" }, s == null ? void 0 : s.headers]),
      __binaryResponse: !0
    });
  }
  /**
   * Create a video remix
   */
  remix(e, t, s) {
    return this._client.post(f`/videos/${e}/remix`, Ws({ body: t, ...s }, this._client));
  }
}
var we, Tr, at;
class Mr extends x {
  constructor() {
    super(...arguments), we.add(this);
  }
  /**
   * Validates that the given payload was sent by OpenAI and parses the payload.
   */
  async unwrap(e, t, s = this._client.webhookSecret, r = 300) {
    return await this.verifySignature(e, t, s, r), JSON.parse(e);
  }
  /**
   * Validates whether or not the webhook payload was sent by OpenAI.
   *
   * An error will be raised if the webhook payload was not sent by OpenAI.
   *
   * @param payload - The webhook payload
   * @param headers - The webhook headers
   * @param secret - The webhook secret (optional, will use client secret if not provided)
   * @param tolerance - Maximum age of the webhook in seconds (default: 300 = 5 minutes)
   */
  async verifySignature(e, t, s = this._client.webhookSecret, r = 300) {
    if (typeof crypto > "u" || typeof crypto.subtle.importKey != "function" || typeof crypto.subtle.verify != "function")
      throw new Error("Webhook signature verification is only supported when the `crypto` global is defined");
    u(this, we, "m", Tr).call(this, s);
    const a = _([t]).values, i = u(this, we, "m", at).call(this, a, "webhook-signature"), o = u(this, we, "m", at).call(this, a, "webhook-timestamp"), c = u(this, we, "m", at).call(this, a, "webhook-id"), l = parseInt(o, 10);
    if (isNaN(l))
      throw new Re("Invalid webhook timestamp format");
    const h = Math.floor(Date.now() / 1e3);
    if (h - l > r)
      throw new Re("Webhook timestamp is too old");
    if (l > h + r)
      throw new Re("Webhook timestamp is too new");
    const d = i.split(" ").map((w) => w.startsWith("v1,") ? w.substring(3) : w), p = s.startsWith("whsec_") ? Buffer.from(s.replace("whsec_", ""), "base64") : Buffer.from(s, "utf-8"), m = c ? `${c}.${o}.${e}` : `${o}.${e}`, g = await crypto.subtle.importKey("raw", p, { name: "HMAC", hash: "SHA-256" }, !1, ["verify"]);
    for (const w of d)
      try {
        const S = Buffer.from(w, "base64");
        if (await crypto.subtle.verify("HMAC", g, S, new TextEncoder().encode(m)))
          return;
      } catch {
        continue;
      }
    throw new Re("The given webhook signature does not match the expected signature");
  }
}
we = /* @__PURE__ */ new WeakSet(), Tr = function(e) {
  if (typeof e != "string" || e.length === 0)
    throw new Error("The webhook secret must either be set using the env var, OPENAI_WEBHOOK_SECRET, on the client class, OpenAI({ webhookSecret: '123' }), or passed to this function");
}, at = function(e, t) {
  if (!e)
    throw new Error("Headers are required");
  const s = e.get(t);
  if (s == null)
    throw new Error(`Missing required header: ${t}`);
  return s;
};
var Yt, Rs, it, Nr;
class $ {
  /**
   * API Client for interfacing with the OpenAI API.
   *
   * @param {string | undefined} [opts.apiKey=process.env['OPENAI_API_KEY'] ?? undefined]
   * @param {string | null | undefined} [opts.organization=process.env['OPENAI_ORG_ID'] ?? null]
   * @param {string | null | undefined} [opts.project=process.env['OPENAI_PROJECT_ID'] ?? null]
   * @param {string | null | undefined} [opts.webhookSecret=process.env['OPENAI_WEBHOOK_SECRET'] ?? null]
   * @param {string} [opts.baseURL=process.env['OPENAI_BASE_URL'] ?? https://api.openai.com/v1] - Override the default base URL for the API.
   * @param {number} [opts.timeout=10 minutes] - The maximum amount of time (in milliseconds) the client will wait for a response before timing out.
   * @param {MergedRequestInit} [opts.fetchOptions] - Additional `RequestInit` options to be passed to `fetch` calls.
   * @param {Fetch} [opts.fetch] - Specify a custom `fetch` function implementation.
   * @param {number} [opts.maxRetries=2] - The maximum number of times the client will retry a request.
   * @param {HeadersLike} opts.defaultHeaders - Default headers to include with every request to the API.
   * @param {Record<string, string | undefined>} opts.defaultQuery - Default query parameters to include with every request to the API.
   * @param {boolean} [opts.dangerouslyAllowBrowser=false] - By default, client-side use of this library is not allowed, as it risks exposing your secret API credentials to attackers.
   */
  constructor({ baseURL: e = me("OPENAI_BASE_URL"), apiKey: t = me("OPENAI_API_KEY"), organization: s = me("OPENAI_ORG_ID") ?? null, project: r = me("OPENAI_PROJECT_ID") ?? null, webhookSecret: a = me("OPENAI_WEBHOOK_SECRET") ?? null, ...i } = {}) {
    if (Yt.add(this), it.set(this, void 0), this.completions = new dr(this), this.chat = new hs(this), this.embeddings = new mr(this), this.files = new gr(this), this.images = new Sr(this), this.audio = new Ue(this), this.moderations = new Ar(this), this.models = new vr(this), this.fineTuning = new xe(this), this.graders = new Ss(this), this.vectorStores = new Ct(this), this.webhooks = new Mr(this), this.beta = new be(this), this.batches = new nr(this), this.uploads = new As(this), this.responses = new $t(this), this.realtime = new Rt(this), this.conversations = new gs(this), this.evals = new ws(this), this.containers = new ps(this), this.videos = new Fr(this), t === void 0)
      throw new v("Missing credentials. Please pass an `apiKey`, or set the `OPENAI_API_KEY` environment variable.");
    const o = {
      apiKey: t,
      organization: s,
      project: r,
      webhookSecret: a,
      ...i,
      baseURL: e || "https://api.openai.com/v1"
    };
    if (!o.dangerouslyAllowBrowser && ga())
      throw new v(`It looks like you're running in a browser-like environment.

This is disabled by default, as it risks exposing your secret API credentials to attackers.
If you understand the risks and have appropriate mitigations in place,
you can set the \`dangerouslyAllowBrowser\` option to \`true\`, e.g.,

new OpenAI({ apiKey, dangerouslyAllowBrowser: true });

https://help.openai.com/en/articles/5112595-best-practices-for-api-key-safety
`);
    this.baseURL = o.baseURL, this.timeout = o.timeout ?? Rs.DEFAULT_TIMEOUT, this.logger = o.logger ?? console;
    const c = "warn";
    this.logLevel = c, this.logLevel = Ds(o.logLevel, "ClientOptions.logLevel", this) ?? Ds(me("OPENAI_LOG"), "process.env['OPENAI_LOG']", this) ?? c, this.fetchOptions = o.fetchOptions, this.maxRetries = o.maxRetries ?? 2, this.fetch = o.fetch ?? xa(), R(this, it, va), this._options = o, this.apiKey = typeof t == "string" ? t : "Missing Key", this.organization = s, this.project = r, this.webhookSecret = a;
  }
  /**
   * Create a new client instance re-using the same options given to the current client with optional overriding.
   */
  withOptions(e) {
    return new this.constructor({
      ...this._options,
      baseURL: this.baseURL,
      maxRetries: this.maxRetries,
      timeout: this.timeout,
      logger: this.logger,
      logLevel: this.logLevel,
      fetch: this.fetch,
      fetchOptions: this.fetchOptions,
      apiKey: this.apiKey,
      organization: this.organization,
      project: this.project,
      webhookSecret: this.webhookSecret,
      ...e
    });
  }
  defaultQuery() {
    return this._options.defaultQuery;
  }
  validateHeaders({ values: e, nulls: t }) {
  }
  async authHeaders(e) {
    return _([{ Authorization: `Bearer ${this.apiKey}` }]);
  }
  stringifyQuery(e) {
    return Ia(e, { arrayFormat: "brackets" });
  }
  getUserAgent() {
    return `${this.constructor.name}/JS ${ge}`;
  }
  defaultIdempotencyKey() {
    return `stainless-node-retry-${rn()}`;
  }
  makeStatusError(e, t, s, r) {
    return U.generate(e, t, s, r);
  }
  async _callApiKey() {
    const e = this._options.apiKey;
    if (typeof e != "function")
      return !1;
    let t;
    try {
      t = await e();
    } catch (s) {
      throw s instanceof v ? s : new v(
        `Failed to get token from 'apiKey' function: ${s.message}`,
        // @ts-ignore
        { cause: s }
      );
    }
    if (typeof t != "string" || !t)
      throw new v(`Expected 'apiKey' function argument to return a string but it returned ${t}`);
    return this.apiKey = t, !0;
  }
  buildURL(e, t, s) {
    const r = !u(this, Yt, "m", Nr).call(this) && s || this.baseURL, a = da(e) ? new URL(e) : new URL(r + (r.endsWith("/") && e.startsWith("/") ? e.slice(1) : e)), i = this.defaultQuery();
    return ha(i) || (t = { ...i, ...t }), typeof t == "object" && t && !Array.isArray(t) && (a.search = this.stringifyQuery(t)), a.toString();
  }
  /**
   * Used as a callback for mutating the given `FinalRequestOptions` object.
   */
  async prepareOptions(e) {
    await this._callApiKey();
  }
  /**
   * Used as a callback for mutating the given `RequestInit` object.
   *
   * This is useful for cases where you want to add certain headers based off of
   * the request properties, e.g. `method` or `url`.
   */
  async prepareRequest(e, { url: t, options: s }) {
  }
  get(e, t) {
    return this.methodRequest("get", e, t);
  }
  post(e, t) {
    return this.methodRequest("post", e, t);
  }
  patch(e, t) {
    return this.methodRequest("patch", e, t);
  }
  put(e, t) {
    return this.methodRequest("put", e, t);
  }
  delete(e, t) {
    return this.methodRequest("delete", e, t);
  }
  methodRequest(e, t, s) {
    return this.request(Promise.resolve(s).then((r) => ({ method: e, path: t, ...r })));
  }
  request(e, t = null) {
    return new bt(this, this.makeRequest(e, t, void 0));
  }
  async makeRequest(e, t, s) {
    var k, y;
    const r = await e, a = r.maxRetries ?? this.maxRetries;
    t == null && (t = a), await this.prepareOptions(r);
    const { req: i, url: o, timeout: c } = await this.buildRequest(r, {
      retryCount: a - t
    });
    await this.prepareRequest(i, { url: o, options: r });
    const l = "log_" + (Math.random() * (1 << 24) | 0).toString(16).padStart(6, "0"), h = s === void 0 ? "" : `, retryOf: ${s}`, d = Date.now();
    if (B(this).debug(`[${l}] sending request`, oe({
      retryOfRequestLogID: s,
      method: r.method,
      url: o,
      options: r,
      headers: i.headers
    })), (k = r.signal) != null && k.aborted)
      throw new G();
    const p = new AbortController(), m = await this.fetchWithTimeout(o, i, c, p).catch(Wt), g = Date.now();
    if (m instanceof globalThis.Error) {
      const b = `retrying, ${t} attempts remaining`;
      if ((y = r.signal) != null && y.aborted)
        throw new G();
      const A = Bt(m) || /timed? ?out/i.test(String(m) + ("cause" in m ? String(m.cause) : ""));
      if (t)
        return B(this).info(`[${l}] connection ${A ? "timed out" : "failed"} - ${b}`), B(this).debug(`[${l}] connection ${A ? "timed out" : "failed"} (${b})`, oe({
          retryOfRequestLogID: s,
          url: o,
          durationMs: g - d,
          message: m.message
        })), this.retryRequest(r, t, s ?? l);
      throw B(this).info(`[${l}] connection ${A ? "timed out" : "failed"} - error; no more retries left`), B(this).debug(`[${l}] connection ${A ? "timed out" : "failed"} (error; no more retries left)`, oe({
        retryOfRequestLogID: s,
        url: o,
        durationMs: g - d,
        message: m.message
      })), A ? new ns() : new wt({ cause: m });
    }
    const w = [...m.headers.entries()].filter(([b]) => b === "x-request-id").map(([b, A]) => ", " + b + ": " + JSON.stringify(A)).join(""), S = `[${l}${h}${w}] ${i.method} ${o} ${m.ok ? "succeeded" : "failed"} with status ${m.status} in ${g - d}ms`;
    if (!m.ok) {
      const b = await this.shouldRetry(m);
      if (t && b) {
        const E = `retrying, ${t} attempts remaining`;
        return await Sa(m.body), B(this).info(`${S} - ${E}`), B(this).debug(`[${l}] response error (${E})`, oe({
          retryOfRequestLogID: s,
          url: m.url,
          status: m.status,
          headers: m.headers,
          durationMs: g - d
        })), this.retryRequest(r, t, s ?? l, m.headers);
      }
      const A = b ? "error; no more retries left" : "error; not retryable";
      B(this).info(`${S} - ${A}`);
      const F = await m.text().catch((E) => Wt(E).message), P = pa(F), C = P ? void 0 : F;
      throw B(this).debug(`[${l}] response error (${A})`, oe({
        retryOfRequestLogID: s,
        url: m.url,
        status: m.status,
        headers: m.headers,
        message: C,
        durationMs: Date.now() - d
      })), this.makeStatusError(m.status, P, C, m.headers);
    }
    return B(this).info(S), B(this).debug(`[${l}] response start`, oe({
      retryOfRequestLogID: s,
      url: m.url,
      status: m.status,
      headers: m.headers,
      durationMs: g - d
    })), { response: m, options: r, controller: p, requestLogID: l, retryOfRequestLogID: s, startTime: d };
  }
  getAPIList(e, t, s) {
    return this.requestAPIList(t, { method: "get", path: e, ...s });
  }
  requestAPIList(e, t) {
    const s = this.makeRequest(t, null, void 0);
    return new Da(this, s, e);
  }
  async fetchWithTimeout(e, t, s, r) {
    const { signal: a, method: i, ...o } = t || {};
    a && a.addEventListener("abort", () => r.abort());
    const c = setTimeout(() => r.abort(), s), l = globalThis.ReadableStream && o.body instanceof globalThis.ReadableStream || typeof o.body == "object" && o.body !== null && Symbol.asyncIterator in o.body, h = {
      signal: r.signal,
      ...l ? { duplex: "half" } : {},
      method: "GET",
      ...o
    };
    i && (h.method = i.toUpperCase());
    try {
      return await this.fetch.call(void 0, e, h);
    } finally {
      clearTimeout(c);
    }
  }
  async shouldRetry(e) {
    const t = e.headers.get("x-should-retry");
    return t === "true" ? !0 : t === "false" ? !1 : e.status === 408 || e.status === 409 || e.status === 429 || e.status >= 500;
  }
  async retryRequest(e, t, s, r) {
    let a;
    const i = r == null ? void 0 : r.get("retry-after-ms");
    if (i) {
      const c = parseFloat(i);
      Number.isNaN(c) || (a = c);
    }
    const o = r == null ? void 0 : r.get("retry-after");
    if (o && !a) {
      const c = parseFloat(o);
      Number.isNaN(c) ? a = Date.parse(o) - Date.now() : a = c * 1e3;
    }
    if (!(a && 0 <= a && a < 60 * 1e3)) {
      const c = e.maxRetries ?? this.maxRetries;
      a = this.calculateDefaultRetryTimeoutMillis(t, c);
    }
    return await Be(a), this.makeRequest(e, t - 1, s);
  }
  calculateDefaultRetryTimeoutMillis(e, t) {
    const a = t - e, i = Math.min(0.5 * Math.pow(2, a), 8), o = 1 - Math.random() * 0.25;
    return i * o * 1e3;
  }
  async buildRequest(e, { retryCount: t = 0 } = {}) {
    const s = { ...e }, { method: r, path: a, query: i, defaultBaseURL: o } = s, c = this.buildURL(a, i, o);
    "timeout" in s && ma("timeout", s.timeout), s.timeout = s.timeout ?? this.timeout;
    const { bodyHeaders: l, body: h } = this.buildBody({ options: s }), d = await this.buildHeaders({ options: e, method: r, bodyHeaders: l, retryCount: t });
    return { req: {
      method: r,
      headers: d,
      ...s.signal && { signal: s.signal },
      ...globalThis.ReadableStream && h instanceof globalThis.ReadableStream && { duplex: "half" },
      ...h && { body: h },
      ...this.fetchOptions ?? {},
      ...s.fetchOptions ?? {}
    }, url: c, timeout: s.timeout };
  }
  async buildHeaders({ options: e, method: t, bodyHeaders: s, retryCount: r }) {
    let a = {};
    this.idempotencyHeader && t !== "get" && (e.idempotencyKey || (e.idempotencyKey = this.defaultIdempotencyKey()), a[this.idempotencyHeader] = e.idempotencyKey);
    const i = _([
      a,
      {
        Accept: "application/json",
        "User-Agent": this.getUserAgent(),
        "X-Stainless-Retry-Count": String(r),
        ...e.timeout ? { "X-Stainless-Timeout": String(Math.trunc(e.timeout / 1e3)) } : {},
        ...ba(),
        "OpenAI-Organization": this.organization,
        "OpenAI-Project": this.project
      },
      await this.authHeaders(e),
      this._options.defaultHeaders,
      s,
      e.headers
    ]);
    return this.validateHeaders(i), i.values;
  }
  buildBody({ options: { body: e, headers: t } }) {
    if (!e)
      return { bodyHeaders: void 0, body: void 0 };
    const s = _([t]);
    return (
      // Pass raw type verbatim
      ArrayBuffer.isView(e) || e instanceof ArrayBuffer || e instanceof DataView || typeof e == "string" && // Preserve legacy string encoding behavior for now
      s.values.has("content-type") || // `Blob` is superset of `File`
      globalThis.Blob && e instanceof globalThis.Blob || // `FormData` -> `multipart/form-data`
      e instanceof FormData || // `URLSearchParams` -> `application/x-www-form-urlencoded`
      e instanceof URLSearchParams || // Send chunked stream (each chunk has own `length`)
      globalThis.ReadableStream && e instanceof globalThis.ReadableStream ? { bodyHeaders: void 0, body: e } : typeof e == "object" && (Symbol.asyncIterator in e || Symbol.iterator in e && "next" in e && typeof e.next == "function") ? { bodyHeaders: void 0, body: wn(e) } : u(this, it, "f").call(this, { body: e, headers: s })
    );
  }
}
Rs = $, it = /* @__PURE__ */ new WeakMap(), Yt = /* @__PURE__ */ new WeakSet(), Nr = function() {
  return this.baseURL !== "https://api.openai.com/v1";
};
$.OpenAI = Rs;
$.DEFAULT_TIMEOUT = 6e5;
$.OpenAIError = v;
$.APIError = U;
$.APIConnectionError = wt;
$.APIConnectionTimeoutError = ns;
$.APIUserAbortError = G;
$.NotFoundError = ln;
$.ConflictError = un;
$.RateLimitError = hn;
$.BadRequestError = an;
$.AuthenticationError = on;
$.InternalServerError = fn;
$.PermissionDeniedError = cn;
$.UnprocessableEntityError = dn;
$.InvalidWebhookSignatureError = Re;
$.toFile = qa;
$.Completions = dr;
$.Chat = hs;
$.Embeddings = mr;
$.Files = gr;
$.Images = Sr;
$.Audio = Ue;
$.Moderations = Ar;
$.Models = vr;
$.FineTuning = xe;
$.Graders = Ss;
$.VectorStores = Ct;
$.Webhooks = Mr;
$.Beta = be;
$.Batches = nr;
$.Uploads = As;
$.Responses = $t;
$.Realtime = Rt;
$.Conversations = gs;
$.Evals = ws;
$.Containers = ps;
$.Videos = Fr;
const Lr = new $({
  apiKey: process.env.OPENAI_API_KEY
});
async function pi(n) {
  const e = Le.getPath("temp"), t = de(e, `audio_${Date.now()}.wav`);
  return new Promise((s, r) => {
    const a = ie("ffmpeg", [
      "-y",
      // Overwrite output
      "-i",
      n.videoPath,
      // Input video
      "-vn",
      // No video
      "-ar",
      "16000",
      // 16kHz sample rate
      "-ac",
      "1",
      // Mono
      "-c:a",
      "pcm_s16le",
      // PCM 16-bit encoding
      t
    ]);
    let i = "";
    a.stderr.on("data", (o) => {
      i += o.toString();
    }), a.on("close", (o) => {
      o === 0 ? s(t) : r(new Error(`Audio extraction failed: ${i}`));
    }), a.on("error", (o) => {
      r(new Error(`FFmpeg process error: ${o.message}`));
    });
  });
}
async function gi(n) {
  var e, t, s, r, a, i, o, c;
  try {
    console.log("🎤 Starting Whisper transcription for:", n.audioPath);
    const l = await Lr.audio.transcriptions.create({
      file: Xr(n.audioPath),
      model: "whisper-1",
      response_format: "verbose_json",
      timestamp_granularities: ["word"]
    });
    console.log(
      "🔍 Full Whisper API response:",
      JSON.stringify(l, null, 2)
    ), console.log(
      "📊 Transcription segments count:",
      ((e = l.segments) == null ? void 0 : e.length) || 0
    );
    const h = [];
    if (l.words && Array.isArray(l.words)) {
      console.log(
        "📝 Processing top-level words array:",
        l.words.length
      );
      for (const d of l.words)
        console.log("🔤 Processing word:", {
          start: d.start,
          end: d.end,
          text: d.word
        }), h.push({
          start: d.start,
          end: d.end,
          word: d.word
        });
    } else if (l.segments) {
      console.log(
        "📝 Processing segments array:",
        l.segments.length
      );
      for (const d of l.segments)
        if (console.log("📝 Processing segment:", {
          start: d.start,
          end: d.end,
          text: d.text,
          hasWords: !!d.words,
          wordsCount: ((t = d.words) == null ? void 0 : t.length) || 0
        }), d.words)
          for (const p of d.words)
            console.log("🔤 Processing word:", {
              start: p.start,
              end: p.end,
              text: p.word
            }), h.push({
              start: p.start,
              end: p.end,
              word: p.word
            });
    }
    return console.log("✅ Extracted words count:", h.length), console.debug("📋 All extracted words:", h), {
      text: l.text,
      words: h
    };
  } catch (l) {
    throw console.error(
      "Whisper API error:",
      ((a = (r = (s = l.response) == null ? void 0 : s.data) == null ? void 0 : r.error) == null ? void 0 : a.message) || l.message
    ), new Error(
      `Whisper transcription failed: ${((c = (o = (i = l.response) == null ? void 0 : i.data) == null ? void 0 : o.error) == null ? void 0 : c.message) || l.message}`
    );
  }
}
async function _i(n) {
  const e = [], t = n.words, s = n.fullText;
  if (t.length === 0 || !s)
    return e;
  const r = s.split(/[.!?]+/).map((i) => i.trim()).filter((i) => i.length > 0);
  console.log(`🔍 Found ${r.length} sentences in full text:`, r);
  let a = 0;
  for (const i of r) {
    const o = [], c = a < t.length ? t[a].start : 0, l = i.toLowerCase().split(/\s+/);
    let h = 0, d = a;
    for (; d < t.length && h < l.length; ) {
      const p = t[d], m = p.word.toLowerCase().replace(/[^\w]/g, ""), g = l[h].replace(/[^\w]/g, "");
      m === g && (o.push(p), h++, a = d + 1), d++;
    }
    if (o.length > 0) {
      const p = o[o.length - 1].end;
      e.push({
        text: i,
        start: c,
        end: p
      });
    }
  }
  return console.log(
    `✅ Segmented ${t.length} words into ${e.length} sentences`
  ), e;
}
async function wi(n) {
  var o;
  const e = n.sentences.map((c, l) => ({
    id: l,
    text: c.text,
    start: c.start,
    end: c.end
  })), t = JSON.stringify({ sentences: e }), r = ((o = (await Lr.chat.completions.create({
    model: "gpt-4.1-mini",
    temperature: 0,
    messages: [
      {
        role: "system",
        content: `You are analyzing sentences from a video transcript.
Rate how well each sentence stands alone as a short clip for social media.
Only output valid JSON with this exact schema:
[{"id": 0, "sentence": "...", "score": 0.0-1.0, "reason": "..."}]
Do not include any commentary or explanations outside the JSON.`
      },
      { role: "user", content: t }
    ]
  })).choices[0].message.content) == null ? void 0 : o.trim()) || "";
  let a = [];
  try {
    const c = r.match(/\[.*\]/s);
    c ? a = JSON.parse(c[0]) : console.warn("No JSON found in GPT response:", r.slice(0, 300));
  } catch (c) {
    console.warn("Failed to parse GPT response:", r.slice(0, 300)), console.error(c);
  }
  return a.map((c) => {
    const l = e[c.id];
    return l ? {
      sentence: c.sentence || l.text,
      start: l.start,
      end: l.end,
      score: Math.min(Math.max(c.score ?? 0, 0), 1),
      reason: c.reason || ""
    } : null;
  }).filter((c) => !!c);
}
async function yi(n) {
  for (const e of n.filePaths)
    try {
      await Qr(e);
    } catch (t) {
      console.warn(`Failed to delete temp file ${e}:`, t);
    }
}
async function bi() {
  return new Promise((n) => {
    const e = ie("ffmpeg", ["-version"]);
    e.on("close", (t) => {
      n(t === 0);
    }), e.on("error", () => {
      n(!1);
    });
  });
}
function xi(n) {
  if (!n) return 0;
  if (n.includes("/")) {
    const [e, t] = n.split("/").map(Number);
    return t !== 0 ? e / t : 0;
  }
  return parseFloat(n) || 0;
}
const Dr = ae.dirname(Jr(import.meta.url));
process.env.APP_ROOT = ae.join(Dr, "..");
const Zt = process.env.VITE_DEV_SERVER_URL, Ui = ae.join(process.env.APP_ROOT, "dist-electron"), Br = ae.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = Zt ? ae.join(process.env.APP_ROOT, "public") : Br;
let ot;
function Wr() {
  ot = new es({
    icon: ae.join(process.env.VITE_PUBLIC, "electron-vite.svg"),
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: ae.join(Dr, "preload.mjs"),
      contextIsolation: !0,
      nodeIntegration: !1,
      webSecurity: !1
    }
  }), Zt ? ot.loadURL(Zt) : ot.loadFile(ae.join(Br, "index.html"));
}
Le.on("window-all-closed", () => {
  process.platform !== "darwin" && (Le.quit(), ot = null);
});
Le.on("activate", () => {
  es.getAllWindows().length === 0 && Wr();
});
j.handle("video.import", async () => {
  try {
    const n = await _t.showOpenDialog({
      properties: ["openFile"],
      filters: [
        {
          name: "Video Files",
          extensions: ["mp4", "avi", "mov", "mkv", "webm"]
        },
        { name: "All Files", extensions: ["*"] }
      ]
    });
    if (n.canceled || !n.filePaths.length)
      return { success: !1, error: "No file selected" };
    const e = n.filePaths[0];
    try {
      const t = await Si(e);
      return { success: !0, videoPath: `file://${e}`, metadata: t };
    } catch (t) {
      return console.error("Failed to extract video metadata:", t), {
        success: !0,
        videoPath: `file://${e}`,
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
  } catch (n) {
    return {
      success: !1,
      error: n instanceof Error ? n.message : "Unknown error"
    };
  }
});
j.handle("video.clip", async (n, e) => nn(e));
j.handle("video.export", async (n, e) => ta(e));
j.handle("recording.saveFile", async (n, e) => na(e));
j.handle("recording.getMetadata", async (n, e) => ra(e));
j.handle("recording.convertWebmToMp4", async (n, e) => aa(e));
j.handle("recording.getSources", async () => ia());
j.handle("recording.showSourceDialog", async () => la());
j.handle("recording.mergeAudioVideo", async (n, e) => oa(e));
j.handle("recording.mergePiP", async (n, e) => ca(e));
j.handle("dialog.showSaveDialog", async (n, e) => await _t.showSaveDialog(e));
j.handle("file.copyFile", async (n, { sourcePath: e, destinationPath: t }) => {
  const s = await import("fs/promises"), r = e.startsWith("file://") ? e.slice(7) : e;
  return await s.copyFile(r, t), { success: !0 };
});
j.handle("ai.extractAudio", async (n, e) => pi(e));
j.handle("ai.whisperTranscription", async (n, e) => gi(e));
j.handle("ai.segmentTranscript", async (n, e) => _i(e));
j.handle("ai.gptShortSuggestions", async (n, e) => wi(e));
j.handle("ai.cleanupTempFiles", async (n, e) => yi(e));
async function Si(n) {
  return new Promise((e, t) => {
    const s = ie("ffprobe", [
      "-v",
      "quiet",
      "-print_format",
      "json",
      "-show_format",
      "-show_streams",
      n
    ]);
    let r = "", a = "";
    s.stdout.on("data", (i) => r += i), s.stderr.on("data", (i) => a += i), s.on("close", (i) => {
      if (i === 0)
        try {
          const o = JSON.parse(r), c = o.streams.find(
            (l) => l.codec_type === "video"
          );
          if (!c) return t(new Error("No video stream found"));
          e({
            duration: parseFloat(o.format.duration) || 0,
            width: c.width || 0,
            height: c.height || 0,
            format: o.format.format_name || "unknown",
            bitrate: parseInt(o.format.bit_rate) || 0,
            fps: xi(c.r_frame_rate) || 0
          });
        } catch {
          t(new Error("Failed to parse video metadata"));
        }
      else t(new Error(`ffprobe failed with code ${i}: ${a}`));
    });
  });
}
Le.whenReady().then(async () => {
  await bi() || console.warn(
    "FFmpeg is not available in PATH. Video processing will fail."
  ), Wr();
});
export {
  Ui as MAIN_DIST,
  Br as RENDERER_DIST,
  Zt as VITE_DEV_SERVER_URL
};
