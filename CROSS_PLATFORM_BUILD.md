# Cross-Platform Build Solutions

## Current Build Status

### ✅ **Working Builds**
- **Linux AppImage**: `BIDS Collector Desktop-0.0.1.AppImage`
- **Linux DEB Package**: `bids-collector-desktop_0.0.1_amd64.deb`
- **Linux Unpacked**: `linux-unpacked/` directory

### ❌ **Windows Build Issues**
The Windows build fails due to network/certificate issues when downloading Electron binaries. This is common in WSL2 environments.

## Solutions for Windows Builds

### Option 1: Manual Electron Cache (Recommended)
Pre-download Electron binaries manually:

```bash
# Create electron cache directory
mkdir -p ~/.cache/electron

# Download Windows Electron binary manually
wget -O ~/.cache/electron/electron-v37.2.4-win32-x64.zip \
  https://github.com/electron/electron/releases/download/v37.2.4/electron-v37.2.4-win32-x64.zip

# Try Windows build again
npm run electron:build-win
```

### Option 2: Use GitHub Actions
Create `.github/workflows/build.yml` for automated cross-platform builds:

```yaml
name: Build Electron App

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  build:
    strategy:
      matrix:
        os: [ubuntu-latest, windows-latest, macos-latest]
    
    runs-on: ${{ matrix.os }}
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Build Electron app
      run: npm run electron:build
      env:
        GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
    
    - name: Upload artifacts
      uses: actions/upload-artifact@v3
      with:
        name: electron-app-${{ matrix.os }}
        path: dist-electron/
```

### Option 3: Docker Multi-Platform Build
Use electron-builder's Docker support:

```bash
# Build for Windows using Docker
docker run --rm -ti \
  --env-file <(env | grep -iE 'DEBUG|NODE_|ELECTRON_|YARN_|NPM_|CI|CIRCLE|TRAVIS_TAG|TRAVIS|TRAVIS_REPO_|TRAVIS_BUILD_|TRAVIS_BRANCH|TRAVIS_PULL_REQUEST_|APPVEYOR_|CI_|BITRISE|GITLAB_CI|GITHUB_') \
  --env ELECTRON_CACHE="/root/.cache/electron" \
  --env ELECTRON_BUILDER_CACHE="/root/.cache/electron-builder" \
  -v ${PWD}:/project \
  -v ~/.cache/electron:/root/.cache/electron \
  -v ~/.cache/electron-builder:/root/.cache/electron-builder \
  electronuserland/builder:wine \
  /bin/bash -c "npm ci && npm run electron:build-win"
```

### Option 4: Native Windows Development
For guaranteed Windows builds, develop on Windows or use Windows VM:

1. Install Node.js on Windows
2. Clone the repository
3. Run `npm install`
4. Run `npm run electron:build-win`

## Alternative: Build Scripts Enhancement

Add conditional builds based on platform:

```json
{
  "scripts": {
    "electron:build-current": "npm run build && electron-builder --publish=never",
    "electron:build-win-safe": "npm run build && electron-builder --win --publish=never --config.electronDownload.mirror=https://npmmirror.com/mirrors/electron/",
    "electron:build-all-safe": "npm run build && electron-builder --linux --publish=never"
  }
}
```

## Verification

Current available builds in `dist-electron/`:
```
BIDS Collector Desktop-0.0.1.AppImage    # Linux AppImage (Universal)
bids-collector-desktop_0.0.1_amd64.deb   # Linux DEB package
linux-unpacked/                          # Linux development files
```

The Linux builds are ready for distribution and testing!

## Recommended Workflow

1. **Development**: Use `npm run electron:dev` for development
2. **Linux Distribution**: Use the generated AppImage and DEB files
3. **Windows Distribution**: Use GitHub Actions or native Windows build
4. **macOS Distribution**: Build on macOS machine or use GitHub Actions

The project is successfully configured for cross-platform builds - the Windows issue is purely environmental and can be resolved using any of the above methods.
