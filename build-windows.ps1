# PowerShell script to build BIDS Collector Desktop App for Windows x64

Write-Host "Building BIDS Collector Desktop App for Windows x64..." -ForegroundColor Green
Write-Host ""

# Check if Node.js is installed
try {
    $nodeVersion = node --version
    Write-Host "Node.js version: $nodeVersion" -ForegroundColor Cyan
} catch {
    Write-Host "ERROR: Node.js is not installed. Please install Node.js from https://nodejs.org/" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

# Check if Rust is installed
try {
    $rustVersion = rustc --version
    Write-Host "Rust version: $rustVersion" -ForegroundColor Cyan
} catch {
    Write-Host "ERROR: Rust is not installed. Please install Rust from https://rustup.rs/" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

# Install Node.js dependencies
Write-Host "Installing Node.js dependencies..." -ForegroundColor Yellow
try {
    npm install
    Write-Host "Dependencies installed successfully!" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Failed to install Node.js dependencies" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

# Build frontend
Write-Host "Building frontend..." -ForegroundColor Yellow
try {
    npm run build
    Write-Host "Frontend built successfully!" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Failed to build frontend" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

# Add Windows target
Write-Host "Adding Windows target..." -ForegroundColor Yellow
try {
    rustup target add x86_64-pc-windows-msvc
    Write-Host "Windows target added!" -ForegroundColor Green
} catch {
    Write-Host "WARNING: Could not add Windows target (might already exist)" -ForegroundColor Yellow
}

# Build Windows desktop app
Write-Host "Building Windows desktop application..." -ForegroundColor Yellow
Write-Host "This may take several minutes..." -ForegroundColor Cyan
try {
    npm run tauri:build:win
    Write-Host "Build completed successfully!" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Failed to build Windows desktop app" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""
Write-Host "Build completed successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "Built files can be found in:" -ForegroundColor Cyan
Write-Host "- src-tauri\target\x86_64-pc-windows-msvc\release\bundle\msi\" -ForegroundColor White
Write-Host "- src-tauri\target\x86_64-pc-windows-msvc\release\bundle\nsis\" -ForegroundColor White
Write-Host ""

# Open the build directory
$buildPath = "src-tauri\target\x86_64-pc-windows-msvc\release\bundle"
if (Test-Path $buildPath) {
    $choice = Read-Host "Would you like to open the build directory? (y/n)"
    if ($choice -eq "y" -or $choice -eq "Y") {
        Invoke-Item $buildPath
    }
}

Read-Host "Press Enter to exit"
