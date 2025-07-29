# BIDS Collector Desktop

A desktop application for BIDS data collection and management, built with Tauri and SvelteKit.

## Features

- 🧠 **BIDS Compliance**: Proper Brain Imaging Data Structure organization
- 📊 **Dataset Management**: Create, validate, and export BIDS datasets  
- 💾 **Storage Monitoring**: Track local, external, and network storage locations
- 🖥️ **Desktop Native**: Cross-platform desktop app with native performance
- 🌐 **Modern Web Interface**: Responsive design with clean UI built with SvelteKit
- 🎨 **Beautiful UI**: Tailwind CSS and DaisyUI components
- � **Fast & Secure**: Rust backend with web frontend via Tauri
- 💾 **Local-First**: Offline functionality without authentication barriers

## Building for Windows x64

This project uses **GitHub Actions** for automated building. The Windows x64 desktop application is built automatically in the cloud.

### 🚀 Automated Build Process

1. **Push your code** to the GitHub repository
2. **GitHub Actions automatically builds** the Windows x64 application
3. **Download the built app** from the Actions tab as artifacts

### 📦 Download Built Application

After pushing code to GitHub:

1. Go to the **Actions** tab in your GitHub repository
2. Click on the latest **"Build Windows Desktop App"** workflow run
3. Download the artifacts:
   - `windows-installers` - Contains MSI and NSIS installer packages
   - `windows-executable` - Contains the standalone .exe file

### 🔄 Triggering a Build

Builds are automatically triggered when you:
- Push to `main` or `develop` branches
- Create a pull request to `main`
- Manually trigger via the Actions tab (workflow_dispatch)

### 📋 What Gets Built

The GitHub Actions workflow creates:
- **MSI Installer** - Windows installer package
- **NSIS Installer** - Alternative Windows installer
- **Standalone Executable** - Direct .exe file

All targeting **Windows x64** (`x86_64-pc-windows-msvc`)

## Development

### Prerequisites (Development Only)

For local development:
- Node.js (v16 or higher) - Required for frontend development
- Rust (latest stable) - Only needed for `npm run tauri:dev`

*Note: Production builds are handled automatically by GitHub Actions - no local setup required*

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

### Run in Development Mode

```bash
npm run tauri:dev
```

### Available Scripts

- `npm run dev` - Start frontend development server only
- `npm run build` - Build frontend for production
- `npm run tauri:dev` - Run desktop app in development mode (requires local Rust setup)

*Note: Production builds are handled automatically by GitHub Actions*

## Project Structure

```
bids-collector-desktop/
├── .github/workflows/
│   └── build-windows.yml     # GitHub Actions build workflow
├── src/                      # SvelteKit frontend
│   ├── routes/              # App pages/routes
│   │   ├── dataset/         # Dataset management interface  
│   │   └── storage/         # Storage monitoring interface
│   ├── component/           # Reusable Svelte components
│   │   ├── icon/            # Icon component system
│   │   ├── Navbar.svelte    # Application header
│   │   └── Sidebar.svelte   # Navigation sidebar
│   ├── lib/                 # Utilities and configuration
│   │   ├── menu.js          # Navigation menu config
│   │   └── svgs/            # Static SVG icons
│   └── app.html             # HTML template
├── src-tauri/               # Tauri Rust backend
│   ├── src/                 # Rust source code
│   │   ├── main.rs          # Main Tauri app
│   │   └── lib.rs           # Library functions
│   ├── icons/               # Application icons
│   ├── tauri.conf.json      # Tauri configuration
│   └── Cargo.toml           # Rust dependencies
├── build/                   # Built frontend files (generated)
├── static/                  # Static assets
└── package.json             # Node.js dependencies and scripts
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
- **Target Platform**: Windows x64 (x86_64-pc-windows-msvc)
- **Window Size**: 800x600 (resizable)
- **Bundle Formats**: MSI and NSIS installers
- **App ID**: com.bids-collector.desktop

## Troubleshooting

For deployment and build process details, see [DEPLOYMENT.md](DEPLOYMENT.md).

### GitHub Actions Build Issues

If the GitHub Actions build fails:

1. **Check the Actions tab** in your GitHub repository for error logs
2. **Verify the workflow file** is present at `.github/workflows/build-windows.yml`
3. **Ensure your code is pushed** to the main or develop branch
4. **Manual trigger**: Use the "Run workflow" button in the Actions tab

### Development Issues

1. **Frontend development**: Only requires Node.js - `npm run dev`
2. **Local Tauri development**: Requires Rust toolchain - `npm run tauri:dev`
3. **Node.js version**: Ensure you're using Node.js 16+
4. **Dependencies**: Run `npm install` after cloning

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
