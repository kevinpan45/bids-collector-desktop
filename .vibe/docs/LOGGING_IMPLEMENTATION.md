# Logging Feature Implementation

## Overview

This document describes the logging feature implementation for BIDS Collector Desktop. The logging system captures application events, warnings, and errors, storing them in structured log files for debugging and issue resolution.

## Features

### Log Levels
- **INFO**: General application events and messages
- **WARNING**: Non-critical issues or potential problems  
- **ERROR**: Critical issues, failures, or crashes

### Log Storage
- Log files are stored in the application data directory under `logs/`
- Main application logs: `logs/app.log`
- Tauri backend logs: `logs/tauri.log`

### Log Format
Each log entry follows this structure:
```
[YYYY-MM-DD HH:MM:SS] LEVEL: Message
```

Example entries:
```
[2024-08-20 10:30:45] INFO: BIDS Collector Desktop logging system initialized
[2024-08-20 10:31:12] WARNING: Storage location not configured
[2024-08-20 10:32:05] ERROR: Failed to download dataset - Network connection timeout
```

## Implementation

### Frontend Logger (`src/lib/logger.js`)

The frontend logging system provides these functions:

```javascript
import { logInfo, logWarning, logError, logErrorWithDetails } from '$lib/logger.js';

// Log informational messages
await logInfo('Application started successfully');

// Log warnings
await logWarning('Storage configuration incomplete');

// Log errors
await logError('Failed to connect to server');

// Log errors with detailed information
await logErrorWithDetails('Download failed', error);
```

### Backend Implementation (`src-tauri/src/lib.rs`)

The Tauri backend provides these commands:
- `initialize_logging`: Sets up the logging directory structure
- `write_log_entry`: Writes formatted log entries to the application log file

The backend also uses the `tauri-plugin-log` for internal Tauri logging.

### Automatic Initialization

The logging system is automatically initialized when the application starts via the layout component (`src/routes/+layout.svelte`).

## File Locations

When the application runs, log files are created in:

- **Windows**: `%APPDATA%/com.bids-collector.desktop/logs/`
- **macOS**: `~/Library/Application Support/com.bids-collector.desktop/logs/`  
- **Linux**: `~/.local/share/com.bids-collector.desktop/logs/`

## Usage Examples

### Application Startup
```javascript
import { initializeLogger, logInfo } from '$lib/logger.js';

onMount(async () => {
  await initializeLogger();
  await logInfo('BIDS Collector started in local-first mode');
});
```

### Error Handling
```javascript
try {
  await performOperation();
} catch (error) {
  await logErrorWithDetails('Operation failed', error);
  toast.error('Operation failed. Check logs for details.');
}
```

### Progress Tracking
```javascript
await logInfo(`Starting download: ${dataset.name}`);
// ... download logic ...
await logInfo(`Download completed: ${dataset.name}`);
```

## Benefits

1. **Debugging**: Detailed logs help identify issues during development and in production
2. **User Support**: Log files can be shared for troubleshooting
3. **Monitoring**: Track application behavior and performance
4. **Audit Trail**: Record important user actions and system events

## Testing

The logging system includes comprehensive unit tests in `src/lib/logger.test.js` covering:
- Log level formatting
- File writing functionality
- Error handling
- Backend communication

Run tests with:
```bash
npm test src/lib/logger.test.js
```