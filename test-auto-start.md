# Auto-Start Collection Tasks - Test Plan

## Changes Made

1. **Added auto-start functionality to dataset creation flow**
   - Modified `src/routes/dataset/+page.svelte` to automatically start collection tasks after creation
   - Added import for `startTaskDownload` function
   - Updated `startDownload` function to call `startTaskDownload` after creating a collection task

2. **Added settings control for auto-start behavior**
   - Added `autoStartTasks: true` setting to `DEFAULT_SETTINGS.download` in `src/lib/settings.js`
   - Added settings UI in `src/routes/settings/+page.svelte` with toggle control
   - Added auto-save functionality for settings changes

3. **Improved user feedback**
   - Different toast messages based on whether auto-start is enabled
   - Graceful error handling if auto-start fails
   - Clear messaging about where to track progress

## Test Scenarios

### Scenario 1: Auto-start enabled (default)
1. Go to Dataset page
2. Select a dataset and click "Download"
3. Choose storage locations and create collection task
4. **Expected**: Task should be created AND automatically started
5. **Expected**: Toast message: "Download started automatically! Track progress in Collections page."

### Scenario 2: Auto-start disabled
1. Go to Settings page
2. Turn off "Auto-start collection tasks" toggle
3. Go to Dataset page and create a collection task
4. **Expected**: Task should be created but NOT started
5. **Expected**: Toast message: "Collection task created. Go to Collections page to start the download."

### Scenario 3: Auto-start fails
1. Ensure auto-start is enabled
2. Create conditions where `startTaskDownload` might fail (e.g., no storage locations configured)
3. **Expected**: Task should be created but auto-start fails gracefully
4. **Expected**: Toast message about manual start required

### Scenario 4: Settings persistence
1. Go to Settings page
2. Toggle the auto-start setting
3. Refresh the page
4. **Expected**: Setting should be preserved

## Files Modified

- `src/routes/dataset/+page.svelte` - Added auto-start functionality
- `src/lib/settings.js` - Added autoStartTasks setting
- `src/routes/settings/+page.svelte` - Added UI control for the setting

## Benefits

- ✅ Improved user experience - downloads start immediately
- ✅ Configurable behavior - users can disable if needed
- ✅ Graceful fallback - if auto-start fails, user can still start manually
- ✅ Clear feedback - appropriate toast messages for different scenarios
