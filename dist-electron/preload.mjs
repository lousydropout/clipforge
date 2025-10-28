"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld("api", {
  invoke: (channel, args) => {
    const validChannels = ["video.import", "video.clip", "video.export"];
    if (validChannels.includes(channel)) {
      return electron.ipcRenderer.invoke(channel, args);
    }
    throw new Error(`Invalid IPC channel: ${channel}`);
  },
  on: (channel, callback) => {
    const validChannels = ["ffmpeg.progress"];
    if (validChannels.includes(channel)) {
      electron.ipcRenderer.on(channel, (_, data) => callback(data));
    }
  },
  off: (channel, callback) => {
    const validChannels = ["ffmpeg.progress"];
    if (validChannels.includes(channel)) {
      electron.ipcRenderer.off(channel, callback);
    }
  }
});
