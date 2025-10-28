import { ipcRenderer, contextBridge } from 'electron'

// --------- Expose secure API to the Renderer process ---------
contextBridge.exposeInMainWorld('api', {
  invoke: (channel: string, args?: any) => {
    const validChannels = ['video.import', 'video.clip', 'video.export']
    if (validChannels.includes(channel)) {
      return ipcRenderer.invoke(channel, args)
    }
    throw new Error(`Invalid IPC channel: ${channel}`)
  },
  on: (channel: string, callback: Function) => {
    const validChannels = ['ffmpeg.progress']
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, (_, data) => callback(data))
    }
  },
  off: (channel: string, callback: Function) => {
    const validChannels = ['ffmpeg.progress']
    if (validChannels.includes(channel)) {
      ipcRenderer.off(channel, callback)
    }
  }
})
