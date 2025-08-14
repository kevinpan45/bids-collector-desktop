# Separate Collection Tasks Implementation

## Overview
I have implemented the functionality to create separate collection tasks for each selected storage location when downloading datasets. This provides better granular control, independent progress tracking, and individual task management.

## Changes Made

### 1. New Function in Collections Library (`src/lib/collections.js`)

Added `createCollectionTasksForLocations()` function that:
- Creates a separate collection task for each storage location
- Each task has a unique name indicating the destination: `"Download: {dataset.name} → {location.name}"`
- Each task contains only one storage location in its `storageLocations` array
- Maintains all other task properties (dataset info, download path, etc.)
- Ensures unique task IDs with small delays between creations

### 2. Updated Dataset Page (`src/routes/dataset/+page.svelte`)

Modified the download workflow to:
- Import and use `createCollectionTasksForLocations` instead of `createCollectionTask`
- Handle multiple created tasks in the auto-start logic
- Provide detailed feedback about the number of tasks created and started
- Update button text to indicate multiple tasks will be created
- Update selection summary to clarify separate tasks will be created

### 3. Enhanced User Feedback

The system now provides more detailed feedback:
- **Task Creation**: "Created X collection tasks for dataset"
- **Auto-start Success**: "All X downloads started automatically!"
- **Partial Auto-start**: "X of Y downloads started automatically"
- **Auto-start Disabled**: "X collection tasks created. Go to Collections page to start the downloads"

## Benefits

### Before (Single Task with Multiple Locations)
- One task with multiple storage locations
- Shared progress across all destinations
- All-or-nothing start/stop/retry
- Mixed status when one location fails

### After (Separate Tasks per Location)
- ✅ **Independent Progress**: Each location has its own progress tracking
- ✅ **Granular Control**: Start/stop/retry individual downloads
- ✅ **Better Error Handling**: One location failure doesn't affect others
- ✅ **Clearer Status**: Each task has its own status (pending, downloading, completed, failed)
- ✅ **Individual Management**: Delete/retry specific location downloads
- ✅ **Parallel Downloads**: Each task can download simultaneously

## User Experience

### Multiple Location Selection
1. User selects multiple storage locations
2. UI shows "X locations selected" and "X separate collection tasks will be created"
3. Button shows "Create Collection Tasks (X Tasks)"
4. System creates X separate tasks, one for each location
5. If auto-start is enabled, all tasks start downloading independently

### Collections Page Display
- Each location now appears as a separate task
- Cleaner display since each task has only one storage location
- Independent progress bars and status for each destination
- Individual controls for each download

## Technical Details

### Task Naming Convention
- Single location: `"Download: {dataset.name}"`
- Multiple locations: `"Download: {dataset.name} → {location.name}"`

### Task Structure
Each task now contains:
```javascript
{
  id: "task-{timestamp}-{random}",
  name: "Download: Dataset Name → Location Name",
  storageLocations: [
    {
      id: "location-id",
      name: "location-name", 
      type: "local|s3",
      path: "storage-path"
    }
  ],
  // ... other properties
}
```

### Backward Compatibility
The original `createCollectionTask()` function is preserved for backward compatibility, but the new workflow uses `createCollectionTasksForLocations()`.

## Files Modified

1. `src/lib/collections.js` - Added new function for creating separate tasks
2. `src/routes/dataset/+page.svelte` - Updated to use new function and handle multiple tasks

This implementation significantly improves the user experience by providing independent control and tracking for each download destination while maintaining the auto-start functionality.
