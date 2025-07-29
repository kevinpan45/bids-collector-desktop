# SVG Icons

This directory contains static SVG icons used throughout the BIDS Collector application.

## Available Icons

### Navigation Icons
- **dashboard.svg** - Home/dashboard icon for main navigation
- **dataset.svg** - Database/dataset icon for dataset management
- **storage.svg** - Server/storage icon for storage management

### Utility Icons
- **settings.svg** - Settings/configuration icon
- **document.svg** - Document/file icon
- **search.svg** - Search/magnifying glass icon
- **download.svg** - Download/export icon

## Usage

These icons are used through the Icon component with `useStaticSVG={true}`:

```svelte
<Icon icon="dashboard" useStaticSVG class="h-5 w-5" />
```

## Icon Properties

- All icons are designed with Heroicons style (outline, 1.5px stroke)
- Compatible with Tailwind CSS classes for sizing and styling
- Use `stroke="currentColor"` to inherit text color
- ViewBox is set to `0 0 24 24` for consistent sizing
