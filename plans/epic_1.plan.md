# Epic 1: Electron Shell Setup

## Current State

The project already has:

- Electron + Vite configured with hot reload
- Basic `main.ts` and `preload.ts` files
- TailwindCSS installed
- TypeScript configs in place

## What Needs to Be Done

### Story 1.1: Enhance Electron Environment

The basic Electron setup exists but needs refinement:

1. **Update `electron/main.ts`**

   - Enable `contextIsolation: true` and `nodeIntegration: false` in webPreferences
   - Add window size and other app configurations
   - Remove test message code (line 38-40)

2. **Add environment configuration** (optional)

   - Create `.env` file if FFmpeg path customization is needed
   - Most systems will have FFmpeg in PATH, so this is low priority

### Story 1.2: Implement Secure IPC Bridge

The preload script exists but needs to be secured and simplified:

1. **Refactor `electron/preload.ts`**

   - Replace generic `ipcRenderer` exposure with restricted API
   - Implement channel whitelist for security
   - Expose only `invoke` method for our use case

Current code exposes all IPC methods. Replace with:

```ts
contextBridge.exposeInMainWorld("api", {
  invoke: (channel: string, args?: any) => {
    const validChannels = ["video.import", "video.clip", "video.export"];
    if (validChannels.includes(channel)) {
      return ipcRenderer.invoke(channel, args);
    }
    throw new Error(`Invalid IPC channel: ${channel}`);
  },
  on: (channel: string, callback: Function) => {
    const validChannels = ["ffmpeg.progress"];
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, (_, data) => callback(data));
    }
  },
});
```

2. **Add TypeScript types**

   - Create `electron/electron-env.d.ts` or update existing one
   - Define `Window.api` interface for type safety in renderer

### Story 1.3: Verify Development Setup

1. Test hot reload works with `bun run dev`
2. Verify renderer can access `window.api`
3. Confirm context isolation is enabled

## Files to Modify

- `electron/main.ts` - Add contextIsolation and security settings
- `electron/preload.ts` - Implement channel whitelist and secure API
- `electron/electron-env.d.ts` - Add type definitions for window.api

## Success Criteria

- Context isolation enabled
- IPC bridge restricted to specific channels
- Type-safe API available in renderer
- Dev server runs without errors
