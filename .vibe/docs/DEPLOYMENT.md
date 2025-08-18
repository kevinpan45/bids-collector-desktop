# BIDS Collector Desktop - Deployment Guide

## 🚀 Automated Deployment with GitHub Actions

This project is configured for **automated building** using GitHub Actions. No local build setup required!

## 📋 How It Works

1. **Push Code** → GitHub automatically builds Windows x64 app
2. **Download** → Get installers and executables from GitHub Actions
3. **Distribute** → Share the built files with users

## 🔄 Getting Your Built App

### Step 1: Push Your Code
```bash
git add .
git commit -m "Your changes"
git push origin main
```

### Step 2: Wait for Build
- Go to your GitHub repository
- Click the **"Actions"** tab
- Watch the **"Build Windows Desktop App"** workflow run

### Step 3: Download Built Files
Once the build completes (usually 5-10 minutes):

1. Click on the completed workflow run
2. Scroll down to **"Artifacts"** section
3. Download:
   - `windows-installers` - MSI and NSIS installer packages
   - `windows-executable` - Standalone .exe file

## 📦 What You Get

- **MSI Installer** - Professional Windows installer
- **NSIS Installer** - Alternative installer format  
- **Standalone EXE** - No installation required

All files are **code-signed** and ready for distribution.

## 🔧 Workflow Triggers

Builds automatically run when you:
- Push to `main` branch
- Push to `develop` branch  
- Create pull requests to `main`
- Manually trigger from Actions tab

## 🛠️ Development

For local development (no build required):
```bash
npm install
npm run dev          # Frontend only
npm run tauri:dev    # Full desktop app (requires Rust)
```

## 📝 Notes

- **No local Rust setup needed** for production builds
- **Cross-platform support** via GitHub Actions
- **Automatic dependency management**
- **Build artifacts kept for 30 days**

## 🆘 Troubleshooting

If builds fail:
1. Check the Actions tab for error logs
2. Ensure all dependencies are in package.json
3. Verify the workflow file exists at `.github/workflows/build-windows.yml`
4. Try manual trigger from Actions tab

Your desktop app is ready for automated deployment! 🎉
