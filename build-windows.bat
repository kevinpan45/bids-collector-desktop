@echo off
echo Building BIDS Collector Des::  Build Windows desktop app
echo Building Windows desktop application...
npm run tauri:build:win
if errorlevel 1 (
    echo ERROR: Failed to build Windows desktop app
    pause
    exit /b 1
) for Windows x64...
echo.

:: Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js is not installed. Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

:: Check if Rust is installed
rustc --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Rust is not installed. Please install Rust from https://rustup.rs/
    pause
    exit /b 1
)

:: Install Node.js dependencies
echo Installing Node.js dependencies...
npm install
if errorlevel 1 (
    echo ERROR: Failed to install Node.js dependencies
    pause
    exit /b 1
)

:: Build frontend
echo Building frontend...
npm run build
if errorlevel 1 (
    echo ERROR: Failed to build frontend
    pause
    exit /b 1
)

:: Add Windows target if not already added
echo Adding Windows target...
rustup target add x86_64-pc-windows-msvc

:: Build Windows desktop app
echo Building Windows desktop application...
npm run tauri:build:win
if errorlevel 1 (
    echo ERROR: Failed to build Windows desktop app
    pause
    exit /b 1
)

echo.
echo Build completed successfully!
echo.
echo Built files can be found in:
echo - src-tauri\target\x86_64-pc-windows-msvc\release\bundle\msi\
echo - src-tauri\target\x86_64-pc-windows-msvc\release\bundle\nsis\
echo.
pause
