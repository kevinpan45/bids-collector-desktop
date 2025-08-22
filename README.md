# BIDS Collector Desktop

A desktop application for discovering, downloading, and managing BIDS (Brain Imaging Data Structure) datasets from OpenNeuro and other sources. Built with Tauri and SvelteKit for cross-platform native performance with a modern web interface.

## Features

- 🧠 **BIDS Compliance**: Proper Brain Imaging Data Structure organization and dataset collection
- 📊 **Dataset Discovery**: Browse and discover BIDS datasets from OpenNeuro with detailed metadata
- 📥 **Multi-Target Downloads**: Download datasets to multiple storage locations simultaneously
- 💾 **Flexible Storage**: Support for local storage and S3-compatible cloud storage (MinIO, AWS S3, etc.)
- ⚡ **Background Downloads**: Persistent background downloads with real-time progress tracking
- 🔄 **Collection Management**: Create and monitor collection tasks with detailed progress updates
- 🖥️ **Desktop Native**: Cross-platform desktop app with native performance via Tauri
- 🌐 **Modern Web Interface**: Responsive design with clean UI built with SvelteKit
- 🎨 **Beautiful UI**: Tailwind CSS and DaisyUI components with grid/list view modes
- 🚀 **Fast & Secure**: Rust backend with web frontend for optimal performance
- 💾 **Local-First**: Offline functionality without authentication barriers
- ⚙️ **Configurable Settings**: Customizable download settings, S3 configuration, and UI preferences
- 🔍 **Smart Filtering**: Filter datasets by provider, modality, and other criteria
- 📈 **Real-time Monitoring**: Live progress tracking with file-level details and download speeds

## Download & Installation

### 📥 Pre-built Releases

**Windows x64** desktop applications are available as pre-built releases:

1. **Visit the [Releases](https://github.com/kevinpan45/bids-collector-desktop/releases) page**
2. **Download the latest release** for Windows x64:
   - `BIDS-Collector-Setup.msi` - Windows installer (recommended)
   - `BIDS-Collector-Setup.exe` - Alternative NSIS installer
   - `BIDS-Collector.exe` - Standalone executable

3. **Install and run** the application

### 🔧 Build from Source

For developers or those who want to build from source, see the [GitHub Actions README](.github/workflows/README.md) for automated building instructions, or follow the development setup below.

## Development

### Prerequisites (Development Only)

For local development:
- Node.js (v16 or higher) - Required for frontend development
- Rust (latest stable) - Only needed for `npm run tauri:dev`

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

- `npm run dev` - Start frontend development server only (web browser mode)
- `npm run build` - Build frontend for production
- `npm run tauri:dev` - Run desktop app in development mode with full functionality
- `npm run tauri:build` - Build desktop application for production (requires local Rust setup)
- `npm run test` - Run unit tests
- `npm run test:ui` - Run tests with UI

## Project Structure

This project is built upon the [Svelte UI Template](https://github.com/kevinpan45/svelte-ui-template), which provides the foundational UI framework and component architecture. The BIDS Collector Desktop extends this template with specialized BIDS dataset management functionality, Tauri desktop integration, and Rust backend capabilities for file downloads and storage management.

```
bids-collector-desktop/
├── .github/workflows/
│   └── build-windows.yml     # GitHub Actions build workflow
├── src/                      # SvelteKit frontend (based on svelte-ui-template)
│   ├── routes/              # App pages/routes
│   │   ├── +page.svelte     # Dashboard/home page
│   │   ├── dataset/         # Dataset discovery and download management
│   │   ├── collection/      # Collection task monitoring and management
│   │   ├── storage/         # Storage location configuration
│   │   └── settings/        # Application settings and preferences
│   ├── component/           # Reusable Svelte components (inherited from template)
│   │   ├── icon/            # Icon component system
│   │   ├── Navbar.svelte    # Application header with navigation
│   │   └── Sidebar.svelte   # Navigation sidebar with menu items
│   ├── lib/                 # Utilities and business logic (BIDS-specific extensions)
│   │   ├── backgroundDownloads.js  # Background download management
│   │   ├── collections.js   # Collection task operations
│   │   ├── settings.js      # Settings management and persistence
│   │   ├── storage.js       # Storage configuration utilities
│   │   ├── s3Client.js      # S3-compatible client implementation
│   │   ├── menu.js          # Navigation menu configuration
│   │   └── svgs/            # Static SVG icons
│   └── app.html             # HTML template
├── src-tauri/               # Tauri Rust backend (desktop-specific addition)
│   ├── src/                 # Rust source code
│   │   ├── main.rs          # Main application entry point
│   │   ├── lib.rs           # Core backend functionality and download engine
│   │   └── s3_client.rs     # S3 connection testing utilities
│   ├── icons/               # Application icons for different platforms
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
- **Backend**: Rust with async/await and background task processing
- **HTTP Client**: Reqwest (Rust) + Axios (Frontend)
- **S3 Integration**: AWS SDK for JavaScript + Custom Rust S3 client
- **Build System**: Vite + Cargo
- **Icons**: Iconify + Custom SVG library
- **Testing**: Vitest

## Configuration

The application is configured for:
- **Target Platform**: Windows x64 (x86_64-pc-windows-msvc)
- **Window Size**: 1200x800 (resizable, minimum 800x600)
- **Bundle Formats**: MSI and NSIS installers
- **App ID**: com.bids-collector.desktop
- **Storage Support**: Local filesystem and S3-compatible services
- **Data Sources**: OpenNeuro datasets via public S3 API
- **Background Processing**: Multi-threaded download engine with progress tracking

## Application Overview

### Core Functionality

**Dataset Discovery**
- Browse OpenNeuro datasets with detailed metadata
- Filter by provider, modality, participant count, and size
- Grid and list view modes for dataset exploration
- Real-time search and filtering capabilities

**Collection Management**
- Create collection tasks for downloading datasets
- Select multiple storage destinations per dataset
- Monitor download progress with real-time updates
- Pause, resume, and cancel downloads
- Automatic retry on failures with configurable settings

**Storage Configuration**
- Configure local storage paths
- Set up S3-compatible cloud storage (MinIO, AWS S3, etc.)
- Test storage connections before use
- Multiple storage locations with default preferences

**Background Downloads**
- True background downloading using Rust backend
- Downloads continue even when app is minimized
- File-level progress tracking with current file information
- Speed monitoring and estimated time remaining
- Automatic resume on application restart

**Settings & Preferences**
- Configurable download settings (concurrent downloads, retry attempts)
- S3 endpoint and authentication configuration
- UI preferences (theme, date format)
- Privacy settings (analytics, crash reporting)

### Web vs Desktop Mode

The application runs in two modes:

**Web Browser Mode** (Limited)
- Dataset discovery and browsing
- Storage configuration
- Collection task viewing
- No actual downloads (downloads require desktop mode)

**Desktop Mode** (Full Featured)
- All web mode features
- Background downloads with persistence
- Direct file system access
- S3-compatible storage uploads
- System integration and notifications

## Troubleshooting

### Development Issues

1. **Frontend development**: Only requires Node.js - `npm run dev`
2. **Local Tauri development**: Requires Rust toolchain - `npm run tauri:dev`
3. **Node.js version**: Ensure you're using Node.js 16+
4. **Dependencies**: Run `npm install` after cloning
5. **Background downloads**: Only available in desktop mode (Tauri), not in web browser
6. **S3 testing**: Use the built-in S3 connection test in storage settings
7. **Collection tasks**: Tasks persist locally and sync with backend when available

### Common Issues

**Downloads not working**: Ensure you're running in desktop mode (`npm run tauri:dev`) rather than web mode (`npm run dev`)

**S3 connection failed**: Verify endpoint URL, credentials, and bucket permissions in storage settings

**Tasks stuck in "pending"**: Check that storage locations are properly configured and accessible

**Collection tasks not updating**: Restart the application to sync with any background downloads

## Local-First Architecture

This desktop application provides:

- **No User Accounts**: Direct access without signup/login
- **Local Data Processing**: All operations performed on local machine
- **Offline Capable**: Full functionality without internet (except for dataset discovery and downloads)
- **BIDS Focused**: Purpose-built for Brain Imaging Data Structure datasets
- **Native Performance**: Desktop-native speed and integration with persistent background downloads
- **Multiple Storage Targets**: Simultaneously download to local storage and S3-compatible services
- **Smart Progress Tracking**: File-level progress monitoring with speed and ETA calculations
- **Configurable Settings**: Customizable download behavior, S3 endpoints, and UI preferences

## Contributing

1. Fork the repository
2. Create a feature branch  
3. Make your changes
4. Test thoroughly on target platforms
5. Submit a pull request

## License

See [LICENSE](LICENSE) file for details.
