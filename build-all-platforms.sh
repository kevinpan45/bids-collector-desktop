#!/bin/bash

echo "BIDS Collector Desktop App - Cross-Platform Build Script"
echo "========================================================"
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

echo -e "${CYAN}Node.js version: $(node --version)${NC}"
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

echo ""
echo "Available build targets:"
echo "1) Current platform only"
echo "2) Windows x64"
echo "3) Linux x64"
echo "4) macOS x64"
echo "5) macOS ARM64"
echo "6) All platforms (requires cross-compilation setup)"
echo ""
read -p "Enter your choice (1-6): " choice

case $choice in
    1)
        echo -e "${YELLOW}Building for current platform...${NC}"
        if npm run tauri:build; then
            echo -e "${GREEN}Build completed!${NC}"
            echo "Built files are in: src-tauri/target/release/bundle/"
        else
            echo -e "${RED}ERROR: Build failed${NC}"
            exit 1
        fi
        ;;
    2)
        echo -e "${YELLOW}Building for Windows x64...${NC}"
        rustup target add x86_64-pc-windows-msvc
        if npm run tauri:build:win; then
            echo -e "${GREEN}Windows build completed!${NC}"
            echo "Built files are in: src-tauri/target/x86_64-pc-windows-msvc/release/bundle/"
        else
            echo -e "${RED}ERROR: Windows build failed${NC}"
            exit 1
        fi
        ;;
    3)
        echo -e "${YELLOW}Installing Linux dependencies...${NC}"
        if [[ "$OSTYPE" == "linux-gnu"* ]]; then
            sudo apt-get update
            sudo apt-get install -y libgtk-3-dev libwebkit2gtk-4.0-dev libayatana-appindicator3-dev librsvg2-dev
        fi
        
        echo -e "${YELLOW}Building for Linux x64...${NC}"
        rustup target add x86_64-unknown-linux-gnu
        if npm run tauri:build:linux; then
            echo -e "${GREEN}Linux build completed!${NC}"
            echo "Built files are in: src-tauri/target/x86_64-unknown-linux-gnu/release/bundle/"
        else
            echo -e "${RED}ERROR: Linux build failed${NC}"
            exit 1
        fi
        ;;
    4)
        echo -e "${YELLOW}Building for macOS x64...${NC}"
        rustup target add x86_64-apple-darwin
        if npm run tauri:build:macos; then
            echo -e "${GREEN}macOS x64 build completed!${NC}"
            echo "Built files are in: src-tauri/target/x86_64-apple-darwin/release/bundle/"
        else
            echo -e "${RED}ERROR: macOS x64 build failed${NC}"
            exit 1
        fi
        ;;
    5)
        echo -e "${YELLOW}Building for macOS ARM64...${NC}"
        rustup target add aarch64-apple-darwin
        if npm run tauri:build:macos-arm; then
            echo -e "${GREEN}macOS ARM64 build completed!${NC}"
            echo "Built files are in: src-tauri/target/aarch64-apple-darwin/release/bundle/"
        else
            echo -e "${RED}ERROR: macOS ARM64 build failed${NC}"
            exit 1
        fi
        ;;
    6)
        echo -e "${YELLOW}Building for all platforms...${NC}"
        echo "This requires cross-compilation setup and may not work in all environments."
        
        # Add all targets
        rustup target add x86_64-pc-windows-msvc
        rustup target add x86_64-unknown-linux-gnu
        rustup target add x86_64-apple-darwin
        rustup target add aarch64-apple-darwin
        
        # Install Linux dependencies if on Linux
        if [[ "$OSTYPE" == "linux-gnu"* ]]; then
            sudo apt-get update
            sudo apt-get install -y libgtk-3-dev libwebkit2gtk-4.0-dev libayatana-appindicator3-dev librsvg2-dev
        fi
        
        # Build all targets
        success_count=0
        total_count=4
        
        echo -e "${CYAN}Building Windows x64...${NC}"
        if npm run tauri:build:win; then
            echo -e "${GREEN}✓ Windows x64 build completed!${NC}"
            success_count=$((success_count + 1))
        else
            echo -e "${RED}✗ Windows x64 build failed${NC}"
        fi
        
        echo -e "${CYAN}Building Linux x64...${NC}"
        if npm run tauri:build:linux; then
            echo -e "${GREEN}✓ Linux x64 build completed!${NC}"
            success_count=$((success_count + 1))
        else
            echo -e "${RED}✗ Linux x64 build failed${NC}"
        fi
        
        echo -e "${CYAN}Building macOS x64...${NC}"
        if npm run tauri:build:macos; then
            echo -e "${GREEN}✓ macOS x64 build completed!${NC}"
            success_count=$((success_count + 1))
        else
            echo -e "${RED}✗ macOS x64 build failed${NC}"
        fi
        
        echo -e "${CYAN}Building macOS ARM64...${NC}"
        if npm run tauri:build:macos-arm; then
            echo -e "${GREEN}✓ macOS ARM64 build completed!${NC}"
            success_count=$((success_count + 1))
        else
            echo -e "${RED}✗ macOS ARM64 build failed${NC}"
        fi
        
        echo ""
        echo -e "${CYAN}Build Summary: ${success_count}/${total_count} platforms built successfully${NC}"
        
        if [ $success_count -eq $total_count ]; then
            echo -e "${GREEN}All builds completed successfully!${NC}"
        elif [ $success_count -gt 0 ]; then
            echo -e "${YELLOW}Some builds completed successfully.${NC}"
        else
            echo -e "${RED}All builds failed.${NC}"
            exit 1
        fi
        
        echo "Built files can be found in: src-tauri/target/[target]/release/bundle/"
        ;;
    *)
        echo -e "${RED}Invalid choice. Exiting.${NC}"
        exit 1
        ;;
esac

echo ""
echo -e "${GREEN}Build script completed!${NC}"