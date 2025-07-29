import { app, BrowserWindow, Menu, ipcMain, dialog, shell } from 'electron';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

// Global reference to the main window
let mainWindow;

// 启用详细日志
if (!isDev) {
  console.log('App starting in production mode...');
  console.log('App path:', app.getAppPath());
  console.log('User data path:', app.getPath('userData'));
  console.log('Executable path:', process.execPath);
}

// 获取配置文件路径
const getConfigPath = () => {
  const userDataPath = app.getPath('userData');
  return path.join(userDataPath, 'storage-config.json');
};

// 读取存储配置
const readStorageConfig = () => {
  const configPath = getConfigPath();
  try {
    if (fs.existsSync(configPath)) {
      const data = fs.readFileSync(configPath, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error reading storage config:', error);
  }
  return { storages: [] };
};

// 保存存储配置
const saveStorageConfig = (config) => {
  const configPath = getConfigPath();
  try {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    return true;
  } catch (error) {
    console.error('Error saving storage config:', error);
    return false;
  }
};

// Storage management functions for IPC handlers
const getStorageConfigs = () => {
  const config = readStorageConfig();
  return config.storages || [];
};

const createStorageConfig = (newConfig) => {
  const config = readStorageConfig();
  const id = Date.now().toString();
  const storageConfig = { id, ...newConfig };
  config.storages = config.storages || [];
  config.storages.push(storageConfig);
  
  if (saveStorageConfig(config)) {
    return storageConfig;
  }
  return null;
};

const updateStorageConfig = (id, updatedConfig) => {
  const config = readStorageConfig();
  const index = config.storages.findIndex(s => s.id === id);
  
  if (index !== -1) {
    config.storages[index] = { id, ...updatedConfig };
    if (saveStorageConfig(config)) {
      return config.storages[index];
    }
  }
  return null;
};

const deleteStorageConfig = (id) => {
  const config = readStorageConfig();
  const initialLength = config.storages.length;
  config.storages = config.storages.filter(s => s.id !== id);
  
  if (config.storages.length < initialLength) {
    return saveStorageConfig(config);
  }
  return false;
};

const getStorageConfig = (id) => {
  const config = readStorageConfig();
  return config.storages.find(s => s.id === id) || null;
};

function createWindow() {
  console.log('Creating main window...');
  
  // Get the index.html path first - needed by navigation handlers
  let indexPath;
  if (isDev) {
    indexPath = path.join(__dirname, '../build/index.html');
  } else {
    // In production, the build directory is at the same level as electron directory in ASAR
    indexPath = path.join(__dirname, '../build/index.html');
    
    // If that doesn't exist, try alternative paths
    if (!fs.existsSync(indexPath)) {
      const altPath = path.join(process.resourcesPath, 'app.asar', 'build', 'index.html');
      if (fs.existsSync(altPath)) {
        indexPath = altPath;
      } else {
        // Fallback to app path
        indexPath = path.join(app.getAppPath(), 'build', 'index.html');
      }
    }
  }
  
  console.log('Index path determined:', indexPath);
  console.log('Index file exists:', fs.existsSync(indexPath));
  
  // Get the preload script path - works in both dev and production
  let preloadPath;
  if (isDev) {
    preloadPath = path.join(__dirname, 'preload.js');
  } else {
    // In production, try the unpacked path first, then fallback to ASAR
    const unpackedPath = path.join(process.resourcesPath, 'app.asar.unpacked', 'electron', 'preload.js');
    const asarPath = path.join(__dirname, 'preload.js');
    preloadPath = fs.existsSync(unpackedPath) ? unpackedPath : asarPath;
  }
  
  console.log('Preload path:', preloadPath);
  console.log('Preload file exists:', fs.existsSync(preloadPath));
  
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    title: 'BIDS Collector Desktop',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      webSecurity: true,
      preload: preloadPath
    },
    icon: path.join(__dirname, 'assets', 'icon.png'), // Add your app icon here
    show: false
  });

  // 添加调试事件监听
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.error('Failed to load:', errorCode, errorDescription, validatedURL);
    
    // If load failed and it's a file:// URL, try to redirect to index.html
    if (validatedURL.startsWith('file://') && errorCode !== 0) {
      console.log('Load failed, attempting to redirect to index.html');
      
      // Special handling for index.html requests that fail
      if (validatedURL.includes('index.html') || validatedURL.endsWith('/')) {
        console.log('Index.html or root request failed, using fallback index.html');
        setTimeout(() => {
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.loadFile(indexPath).catch(fallbackError => {
              console.error('Failed to load fallback index.html:', fallbackError);
            });
          }
        }, 100);
      } else {
        // For other failed routes, try to find appropriate HTML file or fallback to index
        try {
          const url = new URL(validatedURL);
          const pathname = url.pathname;
          let routePath = pathname.replace(/\/$/, '');
          if (routePath.startsWith('/')) {
            routePath = routePath.substring(1);
          }
          
          if (routePath) {
            const buildDir = path.dirname(indexPath);
            const possibleHtmlFiles = [
              path.join(buildDir, `${routePath}.html`),
              path.join(buildDir, routePath, 'index.html'),
              indexPath // Always fallback to main index.html
            ];
            
            for (const htmlFile of possibleHtmlFiles) {
              if (fs.existsSync(htmlFile)) {
                console.log('Loading fallback HTML file:', htmlFile);
                setTimeout(() => {
                  if (mainWindow && !mainWindow.isDestroyed()) {
                    mainWindow.loadFile(htmlFile).catch(fallbackError => {
                      console.error('Failed to load fallback HTML file:', fallbackError);
                    });
                  }
                }, 100);
                return;
              }
            }
          }
        } catch (urlError) {
          console.error('Error parsing failed URL:', urlError);
        }
        
        // Ultimate fallback to index.html
        console.log('Using ultimate fallback to index.html');
        setTimeout(() => {
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.loadFile(indexPath).catch(fallbackError => {
              console.error('Failed to load ultimate fallback index.html:', fallbackError);
            });
          }
        }, 100);
      }
    }
  });

  mainWindow.webContents.on('crashed', (event, killed) => {
    console.error('Renderer process crashed:', killed);
  });

  mainWindow.webContents.on('unresponsive', () => {
    console.warn('Renderer process became unresponsive');
  });

  mainWindow.webContents.on('responsive', () => {
    console.log('Renderer process became responsive again');
  });

  // 监听控制台消息
  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log(`Renderer console [${level}]:`, message);
  });

  // Intercept resource requests to handle routing issues
  mainWindow.webContents.session.webRequest.onBeforeRequest((details, callback) => {
    const url = details.url;
    
    // Only handle file:// protocol requests
    if (url.startsWith('file://')) {
      try {
        const urlObj = new URL(url);
        const pathname = urlObj.pathname;
        
        // Handle direct requests to index.html that might not exist at the requested path
        if (pathname.endsWith('/index.html')) {
          // Check if the requested file exists
          const requestedPath = urlObj.pathname.replace(/^\//, '').replace(/\//g, path.sep);
          if (!fs.existsSync(requestedPath)) {
            console.log('Index.html request intercepted, redirecting to build index.html');
            const redirectUrl = `file://${indexPath.replace(/\\/g, '/')}`;
            callback({ redirectURL: redirectUrl });
            return;
          }
        }
        
        // Check if this is a route request (no file extension and not in _app directory)
        if (!path.extname(pathname) && !pathname.includes('/_app/') && pathname !== '/') {
          let routePath = pathname.replace(/\/$/, ''); // Remove trailing slash
          if (routePath.startsWith('/')) {
            routePath = routePath.substring(1); // Remove leading slash
          }
          
          if (routePath) {
            const buildDir = path.dirname(indexPath);
            
            // Try different path combinations for nested routes
            const possibleHtmlFiles = [
              // Direct route (e.g., storage -> storage.html)
              path.join(buildDir, `${routePath}.html`),
              // Nested route (e.g., storage/create -> storage/create.html)
              path.join(buildDir, routePath, 'index.html'),
              path.join(buildDir, `${routePath}.html`),
              // Parent route (e.g., storage/create -> storage.html)
              path.join(buildDir, path.dirname(routePath) + '.html')
            ].filter(p => p !== path.join(buildDir, '.html')); // Remove invalid paths
            
            console.log('Resource request intercepted:', pathname);
            console.log('Route path:', routePath);
            console.log('Checking possible HTML files:', possibleHtmlFiles);
            
            // Check each possible HTML file
            for (const htmlFile of possibleHtmlFiles) {
              if (fs.existsSync(htmlFile)) {
                const redirectUrl = `file://${htmlFile.replace(/\\/g, '/')}`;
                console.log('Redirecting resource request to:', redirectUrl);
                callback({ redirectURL: redirectUrl });
                return;
              }
            }
          }
        }
      } catch (error) {
        console.error('Error in resource request handler:', error);
      }
    }
    
    // Allow normal request processing
    callback({});
  });

  // Load the app
  console.log('Loading file:', indexPath);
  console.log('File exists:', fs.existsSync(indexPath));
  console.log('App path:', app.getAppPath());
  console.log('Resources path:', process.resourcesPath);
  
  if (isDev) {
    console.log('Development mode: loading from localhost:5173');
    mainWindow.loadURL('http://localhost:5173');
    // Open DevTools in development
    mainWindow.webContents.openDevTools();
  } else {
    console.log('Production mode: loading from file system');
    const buildDir = path.dirname(indexPath);
    console.log('Build directory:', buildDir);
    console.log('Build directory exists:', fs.existsSync(buildDir));
    
    // 检查build目录内容
    try {
      const buildFiles = fs.readdirSync(buildDir);
      console.log('Build directory contents:', buildFiles);
    } catch (error) {
      console.error('Error reading build directory:', error);
    }
    
    mainWindow.loadFile(indexPath).catch(error => {
      console.error('Failed to load index.html:', error);
      
      // 作为备选方案，尝试加载一个简单的错误页面
      const errorHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>BIDS Collector Desktop - Error</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            .error { color: red; }
            .info { color: blue; }
          </style>
        </head>
        <body>
          <h1>BIDS Collector Desktop</h1>
          <div class="error">
            <h2>加载错误</h2>
            <p>无法加载主页面。这可能是因为应用程序文件损坏或缺失。</p>
            <p><strong>错误信息:</strong> ${error.message}</p>
          </div>
          <div class="info">
            <h3>调试信息:</h3>
            <p><strong>应用路径:</strong> ${app.getAppPath()}</p>
            <p><strong>用户数据路径:</strong> ${app.getPath('userData')}</p>
            <p><strong>预期文件路径:</strong> ${indexPath}</p>
            <p><strong>文件存在:</strong> ${fs.existsSync(indexPath) ? '是' : '否'}</p>
          </div>
          <p>请尝试重新安装应用程序或联系技术支持。</p>
        </body>
        </html>
      `;
      
      mainWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(errorHtml));
    });
  }

  // Handle client-side routing for static SvelteKit app
  mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
    try {
      const url = new URL(navigationUrl);
      
      // Only handle file:// protocol navigation
      if (url.protocol === 'file:') {
        const pathname = url.pathname;
        console.log('Navigation attempt to:', pathname);
        
        // Handle direct navigation to index.html
        if (pathname.endsWith('/index.html') && !fs.existsSync(pathname)) {
          event.preventDefault();
          console.log('Direct index.html navigation detected, redirecting to build index.html');
          mainWindow.loadFile(indexPath).catch(loadError => {
            console.error('Failed to load index.html:', loadError);
          });
          return;
        }
        
        // Skip if it's already pointing to a specific file
        if (path.extname(pathname)) {
          console.log('File extension detected, allowing normal navigation');
          return;
        }
        
        // Skip if it's the root path
        if (pathname === '/' || pathname === '') {
          console.log('Root path detected, allowing normal navigation');
          return;
        }
        
        // Extract route path from pathname
        let routePath = pathname.replace(/\/$/, ''); // Remove trailing slash
        if (routePath.startsWith('/')) {
          routePath = routePath.substring(1); // Remove leading slash
        }
        
        // Skip empty route names
        if (!routePath) {
          console.log('Empty route path, allowing normal navigation');
          return;
        }
        
        const buildDir = path.dirname(indexPath);
        
        // Try different path combinations for nested routes
        const possibleHtmlFiles = [
          // Direct route (e.g., storage -> storage.html)
          path.join(buildDir, `${routePath}.html`),
          // Nested route (e.g., storage/create -> storage/create.html)
          path.join(buildDir, routePath, 'index.html'),
          path.join(buildDir, `${routePath}.html`),
          // Parent route (e.g., storage/create -> storage.html)
          path.join(buildDir, path.dirname(routePath) + '.html')
        ].filter(p => p !== path.join(buildDir, '.html')); // Remove invalid paths
        
        console.log('Route navigation detected:', pathname);
        console.log('Route path:', routePath);
        console.log('Checking possible HTML files:', possibleHtmlFiles);
        console.log('Build directory:', buildDir);
        
        // Check each possible HTML file
        for (const htmlFile of possibleHtmlFiles) {
          if (fs.existsSync(htmlFile)) {
            event.preventDefault();
            console.log('Found matching HTML file:', htmlFile);
            mainWindow.loadFile(htmlFile).catch(loadError => {
              console.error('Failed to load HTML file:', loadError);
              // Fallback to index.html
              console.log('Falling back to index.html');
              mainWindow.loadFile(indexPath);
            });
            return;
          }
        }
        
        console.log('No matching HTML file found, checking for directory navigation');
        
        // If trying to navigate to a directory that ends with build/, redirect to index
        if (pathname.endsWith('/build/') || pathname.endsWith('/build')) {
          event.preventDefault();
          console.log('Build directory navigation detected, redirecting to index.html');
          mainWindow.loadFile(indexPath);
        } else {
          console.log('Unknown route, allowing default navigation');
        }
      }
    } catch (error) {
      console.error('Error in navigation handler:', error);
      // Allow default navigation on error
    }
  });

  // Show window when ready to prevent visual flash
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Handle window closed
  mainWindow.on('closed', () => {
    // Quit application when main window is closed (Windows behavior)
    app.quit();
  });
}

// This method will be called when Electron has finished initialization
app.whenReady().then(() => {
  console.log('App is ready, creating window...');
  createWindow();

  // IPC handlers for storage management
  ipcMain.handle('storage:getAll', () => {
    return getStorageConfigs();
  });

  ipcMain.handle('storage:create', (event, config) => {
    return createStorageConfig(config);
  });

  ipcMain.handle('storage:update', (event, id, config) => {
    return updateStorageConfig(id, config);
  });

  ipcMain.handle('storage:delete', (event, id) => {
    return deleteStorageConfig(id);
  });

  ipcMain.handle('storage:get', (event, id) => {
    return getStorageConfig(id);
  });

  // IPC handlers for debug functionality
  ipcMain.handle('debug:reloadApp', () => {
    if (mainWindow) {
      mainWindow.reload();
    }
  });

  ipcMain.handle('debug:openDevTools', () => {
    if (mainWindow) {
      mainWindow.webContents.openDevTools();
    }
  });

  ipcMain.handle('debug:clearUserData', () => {
    try {
      const configPath = getConfigPath();
      if (fs.existsSync(configPath)) {
        fs.unlinkSync(configPath);
      }
      if (mainWindow) {
        mainWindow.reload();
      }
      return true;
    } catch (error) {
      console.error('[DEBUG] 清除用户数据失败:', error);
      return false;
    }
  });

  // On Windows, re-create window when app is activated
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
}).catch(error => {
  console.error('Error during app initialization:', error);
});

// Quit when all windows are closed (Windows behavior)
app.on('window-all-closed', () => {
  app.quit();
});

// Security: Prevent new window creation
app.on('web-contents-created', (event, contents) => {
  contents.on('new-window', (event, navigationUrl) => {
    event.preventDefault();
  });
});

// Create application menu
const template = [
  {
    label: 'File',
    submenu: [
      {
        label: 'Quit',
        accelerator: 'Ctrl+Q',
        click: () => {
          app.quit();
        }
      }
    ]
  },
  {
    label: 'Edit',
    submenu: [
      { role: 'undo' },
      { role: 'redo' },
      { type: 'separator' },
      { role: 'cut' },
      { role: 'copy' },
      { role: 'paste' }
    ]
  },
  {
    label: 'View',
    submenu: [
      { role: 'reload' },
      { role: 'forceReload' },
      { role: 'toggleDevTools' },
      { type: 'separator' },
      { role: 'resetZoom' },
      { role: 'zoomIn' },
      { role: 'zoomOut' },
      { type: 'separator' },
      { role: 'togglefullscreen' }
    ]
  },
  {
    label: 'Debug',
    submenu: [
      {
        label: 'Show Debug Info',
        click: () => {
          const info = {
            appVersion: app.getVersion(),
            electronVersion: process.versions.electron,
            nodeVersion: process.versions.node,
            chromiumVersion: process.versions.chrome,
            appPath: app.getAppPath(),
            userDataPath: app.getPath('userData'),
            isDev: isDev,
            platform: process.platform,
            arch: process.arch
          };
          
          dialog.showMessageBox({
            type: 'info',
            title: 'Debug Information',
            message: 'Application Debug Info',
            detail: JSON.stringify(info, null, 2),
            buttons: ['Copy to Clipboard', 'OK']
          }).then(result => {
            if (result.response === 0) {
              // Copy to clipboard
              require('electron').clipboard.writeText(JSON.stringify(info, null, 2));
            }
          });
        }
      },
      {
        label: 'Open User Data Folder',
        click: () => {
          shell.openPath(app.getPath('userData'));
        }
      },
      {
        label: 'Clear User Data',
        click: () => {
          dialog.showMessageBox({
            type: 'warning',
            title: 'Clear User Data',
            message: 'Are you sure you want to clear all user data?',
            detail: 'This will remove all stored configurations and cannot be undone.',
            buttons: ['Cancel', 'Clear Data']
          }).then(result => {
            if (result.response === 1) {
              try {
                const configPath = getConfigPath();
                if (fs.existsSync(configPath)) {
                  fs.unlinkSync(configPath);
                }
                dialog.showMessageBox({
                  type: 'info',
                  title: 'Success',
                  message: 'User data cleared successfully. Please restart the application.'
                });
              } catch (error) {
                dialog.showErrorBox('Error', 'Failed to clear user data: ' + error.message);
              }
            }
          });
        }
      }
    ]
  },
  {
    label: 'Window',
    submenu: [
      { role: 'minimize' },
      { role: 'close' }
    ]
  }
];

const menu = Menu.buildFromTemplate(template);
Menu.setApplicationMenu(menu);
