# BIDS Collector Desktop

A desktop application for BIDS data collection and management, built with Tauri and SvelteKit.

## Features

- 🧠 **BIDS Compliance**: Proper Brain Imaging Data Structure organization
- 📊 **Dataset Management**: Create, validate, and export BIDS datasets  
- 💾 **Storage Monitoring**: Track local, external, and network storage locations
- 🖥️ **Cross-Platform**: Windows, macOS, and Linux support
- 🌐 **Modern Web Interface**: Responsive design with clean UI built with SvelteKit
- 🎨 **Beautiful UI**: Tailwind CSS and DaisyUI components
- ⚡ **Fast & Secure**: Rust backend with web frontend via Tauri
- 💾 **Local-First**: Offline functionality without authentication barriers

## Cross-Platform Support

This project supports **Windows**, **macOS**, and **Linux** platforms with automated builds via GitHub Actions.

### 🚀 Automated Build Process

1. **Push your code** to the GitHub repository
2. **GitHub Actions automatically builds** for all platforms
3. **Download the built apps** from the Actions tab as artifacts

### 📦 Platform Support

| Platform | Architecture | Bundle Formats |
|----------|-------------|----------------|
| **Windows** | x64 | MSI, NSIS |
| **macOS** | x64, ARM64 | DMG, APP |
| **Linux** | x64 | DEB, AppImage |

### 📥 Download Built Applications

After pushing code to GitHub:

1. Go to the **Actions** tab in your GitHub repository
2. Click on the latest **"Build Cross-Platform Desktop App"** workflow run
3. Download the artifacts for your platform:
   - `windows-*` - Windows installers and executables
   - `macos-*` - macOS disk images and app bundles
   - `linux-*` - Linux packages and AppImages

### 🔄 Triggering a Build

Builds are automatically triggered when you:
- Push to `main` or `develop` branches
- Create a pull request to `main`
- Manually trigger via the Actions tab (workflow_dispatch)

### 📋 What Gets Built

The GitHub Actions workflow creates:

**Windows:**
- **MSI Installer** - Windows installer package
- **NSIS Installer** - Alternative Windows installer

**macOS:**
- **DMG** - macOS disk image
- **APP Bundle** - macOS application bundle
- Both Intel (x64) and Apple Silicon (ARM64) versions

**Linux:**
- **DEB Package** - Debian/Ubuntu package
- **AppImage** - Universal Linux application

## Building Locally

### Prerequisites

For local development and building:
- Node.js (v20 or higher)
- Rust (latest stable)
- Platform-specific dependencies (see below)

### Platform-Specific Dependencies

**Linux:**
```bash
sudo apt-get update
sudo apt-get install -y libgtk-3-dev libwebkit2gtk-4.0-dev libayatana-appindicator3-dev librsvg2-dev
```

**macOS:**
```bash
# No additional dependencies required
```

**Windows:**
```bash
# No additional dependencies required
```

### Installation

1. Clone the repository:
```bash
git clone https://github.com/kevinpan45/bids-collector-desktop.git
cd bids-collector-desktop
```

2. Install dependencies:
```bash
npm install
```

### Available Scripts

**Development:**
- `npm run dev` - Start frontend development server only
- `npm run tauri:dev` - Run desktop app in development mode

**Building:**
- `npm run build` - Build frontend for production
- `npm run tauri:build` - Build for current platform
- `npm run tauri:build:win` - Build for Windows x64
- `npm run tauri:build:linux` - Build for Linux x64
- `npm run tauri:build:macos` - Build for macOS x64
- `npm run tauri:build:macos-arm` - Build for macOS ARM64

**Cross-Platform Build Script:**
```bash
./build-all-platforms.sh
```

This interactive script helps you build for specific platforms or all platforms at once.

## Project Structure

```
bids-collector-desktop/
├── .github/workflows/
│   └── build-cross-platform.yml  # GitHub Actions build workflow
├── src/                          # SvelteKit frontend
│   ├── routes/                  # App pages/routes
│   │   ├── dataset/             # Dataset management interface  
│   │   └── storage/             # Storage monitoring interface
│   ├── component/               # Reusable Svelte components
│   │   ├── icon/                # Icon component system
│   │   ├── Navbar.svelte        # Application header
│   │   └── Sidebar.svelte       # Navigation sidebar
│   ├── lib/                     # Utilities and configuration
│   │   ├── menu.js              # Navigation menu config
│   │   └── svgs/                # Static SVG icons
│   └── app.html                 # HTML template
├── src-tauri/                   # Tauri Rust backend
│   ├── src/                     # Rust source code
│   │   ├── main.rs              # Main Tauri app
│   │   └── lib.rs               # Library functions
│   ├── icons/                   # Application icons
│   ├── tauri.conf.json          # Tauri configuration
│   └── Cargo.toml               # Rust dependencies
├── build/                       # Built frontend files (generated)
├── static/                      # Static assets
├── build-all-platforms.sh       # Cross-platform build script
└── package.json                 # Node.js dependencies and scripts
```

## Technology Stack

- **Frontend**: SvelteKit + Vite
- **Styling**: Tailwind CSS + DaisyUI  
- **Desktop Framework**: Tauri v2
- **Backend**: Rust
- **Build System**: Vite + Cargo
- **Icons**: Iconify

## Configuration

The application is configured for:
- **Target Platforms**: Windows x64, macOS (x64 + ARM64), Linux x64
- **Window Size**: 1200x800 (resizable, minimum 800x600)
- **Bundle Formats**: 
  - Windows: MSI and NSIS installers
  - macOS: DMG and APP bundle
  - Linux: DEB package and AppImage
- **App ID**: com.bids-collector.desktop

## Troubleshooting

For deployment and build process details, see [DEPLOYMENT.md](DEPLOYMENT.md).

### GitHub Actions Build Issues

If the GitHub Actions build fails:

1. **Check the Actions tab** in your GitHub repository for error logs
2. **Verify the workflow file** is present at `.github/workflows/build-cross-platform.yml`
3. **Ensure your code is pushed** to the main or develop branch
4. **Manual trigger**: Use the "Run workflow" button in the Actions tab
5. **Platform-specific issues**: Check if specific platform builds are failing

### Development Issues

1. **Frontend development**: Only requires Node.js - `npm run dev`
2. **Local Tauri development**: Requires Rust toolchain - `npm run tauri:dev`
3. **Node.js version**: Ensure you're using Node.js 20+
4. **Dependencies**: Run `npm install` after cloning
5. **Platform dependencies**: Install platform-specific dependencies (see above)

### Cross-Platform Building Issues

1. **Linux**: Install required system dependencies before building
2. **macOS**: May require Xcode Command Line Tools
3. **Windows**: Requires Visual Studio Build Tools or MSVC
4. **Cross-compilation**: Use the provided build script for guided building

## Local-First Architecture

This desktop application provides:

- **No User Accounts**: Direct access without signup/login
- **Local Data Processing**: All operations on local machine
- **Offline Capable**: Full functionality without internet
- **BIDS Focused**: Purpose-built for Brain Imaging Data Structure
- **Native Performance**: Desktop-native speed and integration

## Contributing

1. Fork the repository
2. Create a feature branch  
3. Make your changes
4. Test thoroughly on target platforms
5. Submit a pull request

## License

See [LICENSE](LICENSE) file for details.
