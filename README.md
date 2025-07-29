# BIDS Collector

A local-first web application for BIDS data collection and management.

## Features

- 🧠 **BIDS Compliance**: Proper Brain Imaging Data Structure organization
- 📊 **Dataset Management**: Create, validate, and export BIDS datasets
- 💾 **Storage Monitoring**: Track local, external, and network storage locations
- 🌐 **Modern Web Interface**: Responsive design with clean UI
- 🚀 **Built with SvelteKit**: Modern web development framework
- 🎨 **Beautiful UI**: Tailwind CSS and DaisyUI components
- 📦 **Static Generation**: Optimal performance and deployment
- 💾 **Local-First**: Offline functionality without authentication barriers

## Development Setup

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd bids-collector-desktop
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables (optional):
Copy `.env.example` to `.env` and configure API settings if needed:
```
VITE_API_SERVER=http://localhost:8080
```

### Development

#### Web Development
Run the SvelteKit development server:
```bash
npm run dev
```

#### Production Build
Build the application for production:
```bash
npm run build
```

#### Preview Production Build
Preview the production build locally:
```bash
npm run preview
```

## Project Structure

```
bids-collector/
├── src/               # SvelteKit source code
│   ├── routes/        # Application routes
│   │   ├── dataset/   # Dataset management interface
│   │   └── storage/   # Storage monitoring interface
│   ├── lib/           # Shared utilities and configuration
│   │   ├── menu.js    # Navigation menu configuration
│   │   └── svgs/      # Static SVG icons
│   ├── component/     # Reusable Svelte components
│   │   ├── icon/      # Icon component system
│   │   ├── Navbar.svelte     # Application header
│   │   ├── Sidebar.svelte    # Navigation sidebar
│   │   └── SidebarMenuItem.svelte  # Menu item component
│   └── app.html       # HTML template
├── static/            # Static assets (favicon, etc.)
└── build/             # Built application output
```

## Scripts

- `npm run dev` - Start SvelteKit development server
- `npm run build` - Build SvelteKit for production
- `npm run preview` - Preview production build

## Local-First Architecture

This application is designed as a focused data management tool:

- **No User Accounts**: Direct access to functionality without signup/login
- **Local Data Processing**: All operations performed locally for privacy and speed
- **Offline Capable**: Full functionality without internet connection
- **BIDS Focused**: Purpose-built for Brain Imaging Data Structure compliance
- **Clean Interface**: Simplified UI focused on data management tasks

## Troubleshooting

### Build Issues
- Ensure all dependencies are installed
- Check that the favicon exists in the static folder
- Verify environment variables are set correctly

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

[Add your license information here]
Collector for BIDS Dataset
