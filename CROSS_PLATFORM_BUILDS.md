# Cross-Platform Build Support

This document explains the cross-platform build support added to BIDS Collector Desktop.

## Overview

BIDS Collector Desktop now supports building for:
- **Windows** x64 (x86_64-pc-windows-msvc)
- **macOS** x64 (x86_64-apple-darwin) 
- **macOS** ARM64 (aarch64-apple-darwin)
- **Linux** x64 (x86_64-unknown-linux-gnu)

## GitHub Actions Workflow

The `.github/workflows/build-cross-platform.yml` workflow uses a matrix strategy to build for all supported platforms simultaneously.

### Matrix Configuration

| Platform | Runner | Target | Bundle Types |
|----------|--------|--------|-------------|
| Windows x64 | `windows-latest` | `x86_64-pc-windows-msvc` | MSI, NSIS |
| macOS x64 | `macos-latest` | `x86_64-apple-darwin` | DMG, APP |
| macOS ARM64 | `macos-latest` | `aarch64-apple-darwin` | DMG, APP |
| Linux x64 | `ubuntu-20.04` | `x86_64-unknown-linux-gnu` | DEB, AppImage |

### Dependencies

**Linux-specific dependencies** are automatically installed:
```bash
sudo apt-get install -y libgtk-3-dev libwebkit2gtk-4.0-dev libayatana-appindicator3-dev librsvg2-dev
```

**macOS and Windows** require no additional dependencies.

## Local Building

### NPM Scripts

New build scripts have been added to `package.json`:

```json
{
  "tauri:build:win": "tauri build --target x86_64-pc-windows-msvc --ci",
  "tauri:build:linux": "tauri build --target x86_64-unknown-linux-gnu --ci",
  "tauri:build:macos": "tauri build --target x86_64-apple-darwin --ci",
  "tauri:build:macos-arm": "tauri build --target aarch64-apple-darwin --ci"
}
```

### Interactive Build Script

Use the `build-all-platforms.sh` script for guided building:

```bash
./build-all-platforms.sh
```

This script provides options to:
1. Build for current platform only
2. Build for specific target platform
3. Build for all platforms (cross-compilation)

### Prerequisites by Platform

**For Linux development:**
```bash
sudo apt-get update
sudo apt-get install -y libgtk-3-dev libwebkit2gtk-4.0-dev libayatana-appindicator3-dev librsvg2-dev
```

**For macOS development:**
- Xcode Command Line Tools (usually pre-installed)

**For Windows development:**
- Visual Studio Build Tools or MSVC compiler

## Tauri Configuration

### Bundle Targets

The `src-tauri/tauri.conf.json` has been updated:

```json
{
  "bundle": {
    "active": true,
    "targets": "all",
    "windows": { /* Windows-specific config */ },
    "linux": { 
      "deb": { "depends": [] }
    },
    "macOS": { 
      "hardenedRuntime": true,
      /* macOS-specific config */
    }
  }
}
```

This configuration automatically generates appropriate bundle formats for each platform.

## Release Artifacts

### Development Builds (Pre-release)

Pushed to `main` or `develop` branches create a "latest" pre-release with artifacts for all platforms.

### Tagged Releases

Version tags (e.g., `v1.0.0`) create full releases with artifacts for all platforms and comprehensive installation instructions.

## Troubleshooting

### Common Issues

1. **Linux build fails**: Install required system dependencies
2. **macOS cross-compilation**: Must be built on macOS runner
3. **Windows cross-compilation**: Must be built on Windows runner
4. **Rust targets missing**: GitHub Actions automatically installs targets

### Platform-Specific Notes

- **Linux**: Requires additional system libraries for WebKit and GTK
- **macOS**: Supports both Intel and Apple Silicon architectures
- **Windows**: Creates both MSI and NSIS installers

## Migration from Windows-Only

This implementation replaces the previous `build-windows.yml` workflow while maintaining backward compatibility for all existing functionality.

**Changes made:**
- ✅ Renamed workflow file
- ✅ Added matrix strategy for multiple platforms
- ✅ Added platform-specific dependencies
- ✅ Updated bundle configuration
- ✅ Enhanced documentation
- ✅ Created cross-platform build scripts

**No breaking changes** - all existing Windows builds continue to work exactly as before.