# Debugging Guide for Tauri Development

## Setup Complete! 

I've successfully resolved the Tauri dev issues and set up debugging for your project. Here's what was fixed and configured:

### Issues Resolved:
1. **Missing System Dependencies**: Installed required GTK and WebKit libraries for Linux
2. **VS Code Debug Configuration**: Added proper launch configurations for debugging
3. **Extensions Installed**: 
   - CodeLLDB for Rust debugging
   - rust-analyzer for Rust language support

### Available Debug Configurations:

1. **Debug Tauri Development** - Debug the Rust backend in development mode
2. **Debug Tauri (Launch with Dev Server)** - Debug with frontend server running
3. **Debug Tauri Production** - Debug release build
4. **Debug Frontend (Chrome)** - Debug the Svelte frontend in Chrome

### How to Debug:

#### Backend (Rust) Debugging:
1. Set breakpoints in your Rust code (`src-tauri/src/lib.rs` or `src-tauri/src/main.rs`)
2. Press `F5` or go to Run > Start Debugging
3. Select "Debug Tauri Development" 
4. The debugger will:
   - Build the Rust code
   - Launch the application with debug symbols
   - Stop at your breakpoints

#### Frontend (Svelte) Debugging:
1. Start the dev server: `npm run dev`
2. Use "Debug Frontend (Chrome)" configuration
3. Set breakpoints in your Svelte/JavaScript code
4. Debug in Chrome DevTools

#### Full Stack Debugging:
1. Start frontend dev server first: `npm run dev`
2. Use "Debug Tauri (Launch with Dev Server)" 
3. You can debug both frontend and backend simultaneously

### Available Tasks:
- `tauri:dev-build` - Build Rust code for debugging
- `tauri:build` - Build release version
- `tauri:dev-frontend` - Start frontend dev server
- `tauri:dev-full` - Start full Tauri dev environment

### Environment Variables for Debugging:
- `RUST_LOG=debug` - Enable debug logging
- `RUST_BACKTRACE=1` - Show full stack traces on panic

### Current Status:
✅ Tauri dev is now running successfully
✅ All required dependencies installed
✅ Debug configurations ready
✅ Extensions installed

You can now set breakpoints and debug your Tauri application!
