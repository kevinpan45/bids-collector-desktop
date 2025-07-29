# BIDS Collector Desktop

A Windows desktop application built with SvelteKit and Electron for managing and collecting BIDS data.

## Features

- 🖥️ Windows x64 desktop application
- 🚀 Built with SvelteKit for modern web development
- 🔒 Auth0 integration for secure authentication
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
Copy `.env.example` to `.env` and fill in your Auth0 credentials:
```
VITE_AUTH0_DOMAIN=your-auth0-domain
VITE_AUTH0_CLIENT_ID=your-auth0-client-id
VITE_API_SERVER=http://localhost:8080
VITE_PROTECTED_ROUTES=/job,/dataset
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

#### Electron Distribution
Create Windows x64 distributable packages:
```bash
# Build Windows x64 version
npm run electron:build

# Build for distribution without publishing
npm run electron:dist
```

## Project Structure

```
bids-collector-desktop/
├── electron/           # Electron main process
│   ├── main.js        # Main Electron process
│   └── assets/        # Electron assets
├── src/               # SvelteKit source code
│   ├── routes/        # SvelteKit routes
│   ├── lib/           # Shared libraries (Auth0, etc.)
│   ├── component/     # Svelte components
│   └── app.html       # HTML template
├── static/            # Static assets
├── build/             # Built SvelteKit app
└── dist-electron/     # Electron distribution files
```

## Scripts

- `npm run dev` - Start SvelteKit development server
- `npm run build` - Build SvelteKit for production
- `npm run preview` - Preview production build
- `npm run electron` - Run Electron with built app
- `npm run electron:dev` - Run Electron in development mode
- `npm run electron:build` - Build Windows x64 Electron app
- `npm run electron:dist` - Create Windows x64 distribution packages

## Authentication

The application uses Auth0 for authentication. Make sure to:

1. Set up an Auth0 application
2. Configure the callback URLs in Auth0 dashboard
3. Update the environment variables with your Auth0 credentials

## Troubleshooting

### Windows Build Issues
If you encounter build issues:

1. Ensure you have the latest Windows SDK installed
2. Make sure Visual Studio Build Tools are installed
3. Try clearing the electron cache: `npx electron-builder clean`

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
