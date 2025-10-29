import { ipcRenderer, contextBridge, desktopCapturer } from "electron";

// --------- Expose secure API to the Renderer process ---------
contextBridge.exposeInMainWorld("api", {
  invoke: (channel: string, args?: any) => {
    const validChannels = ["video.import", "video.clip", "video.export", "recording.getSources", "recording.showSourceDialog", "recording.saveFile", "recording.getMetadata", "recording.convertWebmToMp4"];
    if (validChannels.includes(channel)) {
      return ipcRenderer.invoke(channel, args);
    }
    throw new Error(`Invalid IPC channel: ${channel}`);
  },
  on: (channel: string, callback: (data: any) => void) => {
    const validChannels = ["ffmpeg.progress"];
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, (_, data) => callback(data));
    }
  },
  off: (channel: string, callback: (data: any) => void) => {
    const validChannels = ["ffmpeg.progress"];
    if (validChannels.includes(channel)) {
      ipcRenderer.off(channel, callback);
    }
  },
  
  // Desktop capturer for screen recording
  desktopCapturer: {
    getSources: (options: any) => {
      try {
        return desktopCapturer.getSources(options);
      } catch (error) {
        console.error("desktopCapturer.getSources failed:", error);
        throw error;
      }
    },
  },
});
