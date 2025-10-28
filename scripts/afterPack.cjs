// scripts/afterPack.js
const fs = require("fs");
const path = require("path");

module.exports = async function (context) {
  if (process.platform === "linux") {
    const binDir = path.join(context.appOutDir, "resources", "bin", "linux");
    const ffmpegPath = path.join(binDir, "ffmpeg");
    const ffprobePath = path.join(binDir, "ffprobe");
    
    try {
      if (fs.existsSync(ffmpegPath)) {
        fs.chmodSync(ffmpegPath, 0o755);
        console.log("✅ Set executable permissions for FFmpeg");
      } else {
        console.warn("⚠️ FFmpeg binary not found at:", ffmpegPath);
      }
      
      if (fs.existsSync(ffprobePath)) {
        fs.chmodSync(ffprobePath, 0o755);
        console.log("✅ Set executable permissions for FFprobe");
      } else {
        console.warn("⚠️ FFprobe binary not found at:", ffprobePath);
      }
    } catch (e) {
      console.warn("⚠️ Could not set executable permissions:", e);
    }
  }
};
