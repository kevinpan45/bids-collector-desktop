#!/bin/bash

echo "BIDS Collector Desktop App - Linux Build Script"
echo "=============================================="
echo ""
echo "WARNING: Building for Windows from Linux requires cross-compilation setup."
echo "For best results, use this script on a Windows machine or use Docker."
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}ERROR: Node.js is not installed. Please install Node.js first.${NC}"
    exit 1
fi

# Check if Rust is installed
if ! command -v rustc &> /dev/null; then
    echo -e "${RED}ERROR: Rust is not installed. Please install Rust first.${NC}"
    exit 1
fi

echo -e "${CYAN}Node.js version:$(node --version)${NC}"
echo -e "${CYAN}Rust version: $(rustc --version)${NC}"
echo ""

# Install Node.js dependencies
echo -e "${YELLOW}Installing Node.js dependencies...${NC}"
if npm install; then
    echo -e "${GREEN}Dependencies installed successfully!${NC}"
else
    echo -e "${RED}ERROR: Failed to install Node.js dependencies${NC}"
    exit 1
fi

# Build frontend
echo -e "${YELLOW}Building frontend...${NC}"
if npm run build; then
    echo -e "${GREEN}Frontend built successfully!${NC}"
else
    echo -e "${RED}ERROR: Failed to build frontend${NC}"
    exit 1
fi

# For Linux native build (if someone wants to test locally)
echo ""
echo "Choose build target:"
echo "1) Linux native (for testing)"
echo "2) Windows x64 (requires cross-compilation setup)"
echo ""
read -p "Enter your choice (1 or 2): " choice

case $choice in
    1)
        echo -e "${YELLOW}Installing Linux dependencies...${NC}"
        sudo apt-get update
        sudo apt-get install -y libgtk-3-dev libwebkit2gtk-4.0-dev libayatana-appindicator3-dev librsvg2-dev
        
        echo -e "${YELLOW}Building for Linux...${NC}"
        if npm run tauri:build:linux; then
            echo -e "${GREEN}Linux build completed!${NC}"
            echo "Built files are in: src-tauri/target/release/bundle/"
        else
            echo -e "${RED}ERROR: Linux build failed${NC}"
            exit 1
        fi
        ;;
    2)
        echo -e "${YELLOW}Setting up Windows cross-compilation...${NC}"
        echo "This requires additional setup and may not work in all environments."
        
        # Add Windows target
        rustup target add x86_64-pc-windows-msvc
        
        echo -e "${YELLOW}Attempting Windows build...${NC}"
        if npm run tauri:build:win; then
            echo -e "${GREEN}Windows build completed!${NC}"
            echo "Built files are in: src-tauri/target/x86_64-pc-windows-msvc/release/bundle/"
        else
            echo -e "${RED}ERROR: Windows cross-compilation failed${NC}"
            echo "Please use a Windows machine or Docker for Windows builds."
            exit 1
        fi
        ;;
    *)
        echo -e "${RED}Invalid choice. Exiting.${NC}"
        exit 1
        ;;
esac

echo ""
echo -e "${GREEN}Build script completed!${NC}"
