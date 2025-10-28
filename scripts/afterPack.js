// scripts/afterPack.js
const fs = require("fs");
const path = require("path");

exports.default = async function (context) {
  if (process.platform === "linux") {
    const ffmpegPath = path.join(
      context.appOutDir,
      "resources",
      "bin",
      "linux",
      "ffmpeg"
    );
    try {
      fs.chmodSync(ffmpegPath, 0o755);
      console.log("✅ Set executable permissions for FFmpeg");
    } catch (e) {
      console.warn("⚠️ Could not chmod FFmpeg binary:", e);
    }
  }
};
