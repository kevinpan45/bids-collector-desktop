# BIDS Collector Desktop - Windows Build Summary

## ✅ Project Setup Complete

Your Tauri desktop application is now properly configured for Windows x64 builds!

## 📋 What's Been Configured

### 1. **Tauri Configuration**
- Target platform: Windows x64 (`x86_64-pc-windows-msvc`)
- Bundle formats: MSI and NSIS installers
- App identifier: `com.bids-collector.desktop`
- Window configuration: 800x600, resizable

### 2. **Build Scripts**
- `build-windows.ps1` - PowerShell script for Windows
- `build-windows.bat` - Batch script for Windows
- `build.sh` - Bash script for Linux (with limitations)

### 3. **NPM Scripts**
- `npm run tauri:build:win` - Build Windows x64 specifically
- `npm run tauri:dev` - Development mode
- `npm run tauri:build` - Build for current platform

### 4. **GitHub Actions**
- Automated Windows builds on push/PR
- Artifact uploads for installers and executables
- `.github/workflows/build-windows.yml`

## 🚀 How to Build

### **Option 1: Windows Machine (Recommended)**

1. **Prerequisites:**
   - Windows 10/11
   - Node.js 16+
   - Rust toolchain
   - Visual Studio Build Tools

2. **Quick Build:**
   ```powershell
   # Clone the repository
   git clone https://github.com/kevinpan45/bids-collector-desktop.git
   cd bids-collector-desktop
   
   # Use PowerShell script (easiest)
   .\build-windows.ps1
   
   # OR use batch script
   .\build-windows.bat
   
   # OR manual build
   npm install
   npm run build
   npm run tauri:build:win
   ```

3. **Find Built Files:**
   - `src-tauri/target/x86_64-pc-windows-msvc/release/bundle/msi/` - MSI installer
   - `src-tauri/target/x86_64-pc-windows-msvc/release/bundle/nsis/` - NSIS installer

### **Option 2: GitHub Actions (Automated)**

1. Push code to GitHub
2. GitHub Actions automatically builds Windows app
3. Download artifacts from the Actions tab

### **Option 3: Cross-compilation (Limited)**

Cross-compiling from Linux has limitations due to Windows resource compilation requirements. It may fail with `llvm-rc` errors.

## ⚠️ Known Limitations

### Cross-Compilation Issues
- **Error**: `NotAttempted("llvm-rc")`
- **Cause**: Missing Windows resource compiler
- **Solution**: Use Windows machine or GitHub Actions

### Dependencies Required (Windows)
- Visual Studio Build Tools (C++ development tools)
- Windows SDK
- Rust with `x86_64-pc-windows-msvc` target

## 🛠️ Troubleshooting

### Common Build Errors

1. **`llvm-rc` not found**
   - Building from Linux without proper Windows toolchain
   - **Fix**: Use Windows machine

2. **Visual Studio Build Tools missing**
   - Missing C++ compiler
   - **Fix**: Install Visual Studio Build Tools

3. **Rust target missing**
   - Missing Windows target
   - **Fix**: `rustup target add x86_64-pc-windows-msvc`

4. **Node.js version**
   - Using old Node.js version
   - **Fix**: Install Node.js 16+

### Build Cleanup
```bash
# Clean everything and rebuild
rm -rf node_modules src-tauri/target
npm install
npm run build
npm run tauri:build:win  # Windows only
```

## 📁 Project Structure

```
bids-collector-desktop/
├── .github/workflows/
│   └── build-windows.yml     # GitHub Actions workflow
├── src-tauri/               # Tauri Rust backend
│   ├── tauri.conf.json      # Tauri configuration
│   └── Cargo.toml           # Rust dependencies
├── build-windows.ps1        # PowerShell build script
├── build-windows.bat        # Batch build script  
├── build.sh                 # Bash build script
├── BUILD_WINDOWS.md         # Detailed build guide
└── README.md               # Main documentation
```

## 🎯 Next Steps

1. **Test on Windows**: Use the build scripts on a Windows machine
2. **Set up CI/CD**: Use the GitHub Actions workflow for automated builds
3. **Development**: Use `npm run tauri:dev` for development
4. **Distribution**: Share the MSI/NSIS installers with users

## 📚 Documentation

- `README.md` - Main project documentation
- `BUILD_WINDOWS.md` - Detailed Windows build guide
- Build scripts include help and error handling

Your BIDS Collector desktop application is ready for Windows x64 deployment! 🎉
