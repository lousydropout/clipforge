# Epic 5: Packaging and Distribution (Linux)

## Goal

Create a production-ready Linux build of ClipForge with bundled FFmpeg binaries, application icons, and verified build configuration.

## Implementation Steps

### 1. Create Application Icons

**Status**: Icon directory exists but is empty (`assets/icons/png/`)

**Tasks**:

- Generate or create PNG icons in multiple sizes: 16x16, 32x32, 48x48, 64x64, 128x128, 256x256, 512x512
- Place icons in `assets/icons/png/` directory
- Icons should represent video editing (e.g., film strip, scissors, play button)
- Can use a simple placeholder design or tool like GIMP/Inkscape

**Files to create**:

- `assets/icons/png/16x16.png`
- `assets/icons/png/32x32.png`
- `assets/icons/png/48x48.png`
- `assets/icons/png/64x64.png`
- `assets/icons/png/128x128.png`
- `assets/icons/png/256x256.png`
- `assets/icons/png/512x512.png`

### 2. Bundle FFmpeg Binary for Linux

**Current state**: `electron-builder.json5` references `bin/` directory but it doesn't exist

**Tasks**:

- Create `bin/linux/` directory structure
- Download FFmpeg static binary for Linux (from johnvansickle.com or compile)
- Place `ffmpeg` and `ffprobe` binaries in `bin/linux/`
- Update `scripts/afterPack.js` to set executable permissions
- Verify binaries work on target Linux distribution

**Files to create**:

- `bin/linux/ffmpeg` (static binary)
- `bin/linux/ffprobe` (static binary)

**Files to modify**:

- `scripts/afterPack.js` - Update path to match new structure, add ffprobe permissions

### 3. Update FFmpeg Path Resolution

**Current state**: App uses system FFmpeg from PATH

**Tasks**:

- Create utility function to detect bundled vs system FFmpeg
- Priority: bundled binary → system PATH → error
- Update all FFmpeg spawn calls to use resolved path
- Add fallback error messages if FFmpeg not found

**Files to modify**:

- `electron/ffmpeg/runFFmpeg.ts` - Add path resolution logic
- `electron/main.ts` - Add FFmpeg detection on startup

**Implementation approach**:

```typescript
// In electron/ffmpeg/runFFmpeg.ts
function getFFmpegPath(): string {
  const bundledPath = path.join(
    process.resourcesPath,
    "bin",
    "linux",
    "ffmpeg"
  );
  if (fs.existsSync(bundledPath)) return bundledPath;
  return "ffmpeg"; // fallback to system PATH
}
```

### 4. Verify Build Configuration

**Current state**: `electron-builder.json5` exists with basic config

**Tasks**:

- Verify all paths in `electron-builder.json5` are correct
- Ensure `extraResources` includes `bin/` directory
- Confirm `asarUnpack` excludes binaries from asar archive
- Test that `afterPack` script runs correctly
- Update `package.json` version to 0.1.0 (first release)

**Files to modify**:

- `package.json` - Update version to 0.1.0
- `electron-builder.json5` - Verify configuration (likely no changes needed)

### 5. Add Build Documentation

**Tasks**:

- Document build process in README
- Add FFmpeg binary source and licensing info
- Document system requirements
- Add installation instructions for Linux

**Files to modify**:

- `README.md` - Add "Building" and "Distribution" sections

### 6. Test Production Build

**Tasks**:

- Run `bun run build:linux` to create AppImage and deb packages
- Test AppImage on current system
- Verify FFmpeg bundling works correctly
- Test on fresh Linux VM if available (optional)
- Verify file size is reasonable
- Test all core functionality in production build

**Commands to run**:

```bash
bun run build:linux
# Test output in dist/ directory
```

## Success Criteria

- Application icons display correctly in system menus and taskbar
- FFmpeg binaries are bundled and work without system installation
- AppImage and .deb packages build successfully
- Production build runs and can import, trim, and export videos
- Build artifacts are under 200MB total size
- README documents build and installation process
- No runtime errors related to missing FFmpeg

## Technical Notes

- FFmpeg static builds for Linux: https://johnvansickle.com/ffmpeg/
- Typical static FFmpeg binary size: ~80-100MB
- electron-builder automatically handles asar packing/unpacking
- `afterPack` script ensures executable permissions on Linux
- AppImage is portable, .deb is for Debian-based distros
