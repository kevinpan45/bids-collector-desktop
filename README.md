# BIDS Collector Desktop

A Windows desktop application built with SvelteKit and Electron for managing and collecting BIDS data.

## Features

- 🖥️ Windows x64 desktop application
- 🚀 Built with SvelteKit for modern web development
- � Local-first data management
- 🎨 Beautiful UI with Tailwind CSS and DaisyUI
- 📦 Electron for native desktop experience

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

3. Set up environment variables:
Copy `.env.example` to `.env` and configure your API server:
```
VITE_API_SERVER=http://localhost:8080
```

### Development

#### Web Development
Run the SvelteKit development server:
```bash
npm run dev
```

#### Electron Development
Run the application in Electron (with hot reload):
```bash
npm run electron:dev
```

#### Production Build
Build the application for production:
```bash
npm run build
```

## Project Structure

```
bids-collector-desktop/
├── electron/           # Electron main process
│   ├── main.js        # Main Electron process
│   └── assets/        # Electron assets
├── src/               # SvelteKit source code
│   ├── routes/        # SvelteKit routes
│   ├── lib/           # Shared libraries
│   ├── component/     # Svelte components
│   └── app.html       # HTML template
├── static/            # Static assets
└── build/             # Built SvelteKit app
```

## Scripts

- `npm run dev` - Start SvelteKit development server
- `npm run build` - Build SvelteKit for production
- `npm run preview` - Preview production build
- `npm run electron` - Run Electron with built app
- `npm run electron:dev` - Run Electron in development mode

## Local-First Architecture

This application is designed as a local-first desktop application:

- Data is stored locally using Electron's built-in storage capabilities
- No external authentication required
- All features work offline
- Simple and secure local user management

## Troubleshooting

### Electron Library Issues
For Windows-specific issues, ensure you have:
- Microsoft Visual C++ Redistributable installed
- Windows 10/11 with latest updates

### Build Issues
- Ensure all dependencies are installed
- Check that the favicon exists in the static folder  
- Verify environment variables are set correctly
- For Windows builds, ensure Wine is properly configured (if building on non-Windows)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

[Add your license information here]
Collector for BIDS Dataset
