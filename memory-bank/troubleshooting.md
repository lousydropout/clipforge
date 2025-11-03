# Troubleshooting - Screenshare Assist

## Common Issues

### FFmpeg Not Found

**Error**: `FFmpeg not found in PATH`

**Solutions**:

1. Install FFmpeg:

   ```bash
   # Ubuntu/Debian
   sudo apt update && sudo apt install ffmpeg

   # macOS (with Homebrew)
   brew install ffmpeg

   # Windows (with Chocolatey)
   choco install ffmpeg
   ```

2. Verify installation:

   ```bash
   ffmpeg -version
   ```

3. Add to PATH if needed:
   ```bash
   export PATH="/path/to/ffmpeg:$PATH"
   ```

### Video Import Fails

**Error**: `Failed to load video file`

**Solutions**:

1. Check file format support
2. Verify file permissions
3. Ensure file is not corrupted
4. Check file size limits

### FFmpeg Command Fails

**Error**: `FFmpeg process exited with code 1`

**Solutions**:

1. Check input file validity
2. Verify time range (start < end)
3. Ensure output directory exists
4. Check disk space
5. Review FFmpeg logs for specific error

### Electron App Won't Start

**Error**: Various startup issues

**Solutions**:

1. Check Node.js version (≥ 20 required)
2. Clear node_modules and reinstall:
   ```bash
   rm -rf node_modules bun.lock
   bun install
   ```
3. Verify all dependencies installed
4. Check for port conflicts

### Video Preview Not Working

**Error**: Video element shows nothing

**Solutions**:

1. Check video format compatibility
2. Verify file path is correct
3. Check CORS issues (if loading from file://)
4. Ensure video element has proper attributes

## Development Issues

### Hot Reload Not Working

**Solutions**:

1. Restart dev server
2. Clear Vite cache
3. Check for syntax errors
4. Verify file watchers are working

### TypeScript Errors

**Solutions**:

1. Check tsconfig.json configuration
2. Verify type definitions are installed
3. Restart TypeScript service
4. Check for conflicting type definitions

### Build Failures

**Solutions**:

1. Check for TypeScript errors
2. Verify all imports are correct
3. Check for missing dependencies
4. Review build logs for specific errors

## Performance Issues

### Slow Video Processing

**Solutions**:

1. Use `-c copy` for no re-encoding when possible
2. Reduce output resolution
3. Check system resources
4. Consider processing in chunks for large files

### High Memory Usage

**Solutions**:

1. Process videos in smaller segments
2. Clear unused video elements from DOM
3. Monitor memory usage with dev tools
4. Consider streaming for large files

## Debugging Tips

### Enable Debug Logging

```typescript
// In main process
console.log("FFmpeg command:", command);
console.log("FFmpeg output:", output);

// In renderer process
console.log("Video metadata:", metadata);
console.log("Trim settings:", { startTime, endTime });
```

### Check IPC Communication

```typescript
// In preload script
console.log("IPC event sent:", eventName, data);

// In main process
ipcMain.on("video.import", (event, data) => {
  console.log("IPC event received:", "video.import", data);
});
```

### Monitor FFmpeg Process

```typescript
const ffmpeg = spawn("ffmpeg", args);
ffmpeg.stdout.on("data", (data) =>
  console.log("FFmpeg stdout:", data.toString())
);
ffmpeg.stderr.on("data", (data) =>
  console.log("FFmpeg stderr:", data.toString())
);
```

## Getting Help

1. Check this troubleshooting guide first
2. Review FFmpeg documentation for command issues
3. Check Electron documentation for app issues
4. Review project memory bank for context
5. Check GitHub issues for similar problems
