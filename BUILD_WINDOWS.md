# Building Windows x64 Desktop App with Tauri

This guide will help you build the BIDS Collector desktop application for Windows x64 using Tauri.

## ⚠️ Important Notice

**For best results, build on a Windows machine.** Cross-compiling from Linux to Windows is complex and often fails due to missing Windows-specific build tools like `llvm-rc`.

## Prerequisites

### Option 1: Build on Windows (Recommended)
1. Install [Node.js](https://nodejs.org/) (version 16 or higher)
2. Install [Rust](https://rustup.rs/)
3. Install [Microsoft Visual Studio Build Tools](https://visualstudio.microsoft.com/downloads/) or Visual Studio with C++ build tools

### Option 2: Cross-compile from Linux (Advanced - May Fail)
1. Install Rust and Node.js
2. Install Windows build dependencies (complex setup required)
3. Configure cross-compilation toolchain (not guaranteed to work)

## Build Instructions

### On Windows:

1. **Clone and setup the project:**
   ```bash
   git clone https://github.com/kevinpan45/bids-collector-desktop.git
   cd bids-collector-desktop
   npm install
   ```

2. **Build the frontend:**
   ```bash
   npm run build
   ```

3. **Build the Windows desktop app:**
   ```bash
   npm run tauri:build:win
   ```

4. **Find your built application:**
   The built files will be in `src-tauri/target/x86_64-pc-windows-msvc/release/bundle/`:
   - `*.msi` - Windows Installer package
   - `*.exe` - Standalone executable

### Build Scripts Available:

- `npm run tauri:dev` - Run in development mode
- `npm run tauri:build` - Build for current platform
- `npm run tauri:build:win` - Build specifically for Windows x64
- `npm run tauri:build:linux` - Build for Linux

## Project Configuration

The project is configured with:
- **Frontend**: SvelteKit with Vite
- **UI Framework**: DaisyUI + Tailwind CSS
- **Desktop Runtime**: Tauri v2
- **Target Platform**: Windows x64 (x86_64-pc-windows-msvc)
- **Bundle Formats**: MSI and NSIS installers

### Troubleshooting

### Common Issues:

1. **Cross-compilation fails with `llvm-rc` error**: 
   - This happens when building from Linux
   - **Solution**: Use a Windows machine for building

2. **`tauri-winres` errors**:
   - Windows resource compilation requires Windows-specific tools
   - **Solution**: Build on Windows with Visual Studio Build Tools

3. **Rust not found**: Make sure Rust is installed and in your PATH

4. **Visual Studio Build Tools missing**: Install Microsoft Visual Studio Build Tools

5. **Node.js version**: Ensure you're using Node.js 16 or higher

6. **Build fails**: Try cleaning and rebuilding:
   ```bash
   rm -rf node_modules src-tauri/target
   npm install
   npm run build
   npm run tauri:build:win
   ```

### Cross-Compilation Issues

If you encounter errors like:
- `NotAttempted("llvm-rc")`
- `tauri-winres` build failures
- Windows resource compilation errors

These indicate that cross-compilation from Linux is not working. The recommended solution is to use a Windows machine or Windows-based CI/CD pipeline.

## File Structure

```
bids-collector-desktop/
├── src/                    # Svelte frontend source
├── src-tauri/             # Tauri backend source
│   ├── src/               # Rust source code
│   ├── icons/             # App icons
│   ├── tauri.conf.json    # Tauri configuration
│   └── Cargo.toml         # Rust dependencies
├── build/                 # Built frontend files
└── package.json           # Node.js dependencies and scripts
```

## App Information

- **App Name**: BIDS Collector
- **Version**: 0.1.0
- **Description**: BIDS Data Collection and Management Tool
- **Window Size**: 800x600 (resizable)
- **Bundle ID**: com.bids-collector.desktop
