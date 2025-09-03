const {
  app,
  BrowserWindow,
  Menu,
  shell,
  dialog,
  ipcMain,
} = require('electron');
const path = require('path');
const isDev = process.env.NODE_ENV === 'development';

// Keep a global reference of the window object
let mainWindow;

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: true,
    },
    icon: path.join(__dirname, '../apps/antwrite/public/favicon.ico'),
    show: false, // Don't show until ready-to-show
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    trafficLightPosition: { x: 10, y: 10 },
  });

  // Load the app
  const startUrl = isDev
    ? 'http://localhost:3000'
    : `file://${path.join(__dirname, '../apps/antwrite/out/index.html')}`;

  // Configure security for local file loading
  if (!isDev) {
    mainWindow.webContents.session.webRequest.onHeadersReceived(
      (details, callback) => {
        callback({
          responseHeaders: {
            ...details.responseHeaders,
            'Content-Security-Policy': [
              "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob:; " +
                "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
                "style-src 'self' 'unsafe-inline' data:; " +
                "img-src 'self' data: blob: https: http:; " +
                "font-src 'self' data: https: http:; " +
                "connect-src 'self' https: http: wss: ws: data: blob:; " +
                "media-src 'self' data: blob: https: http:; " +
                "object-src 'none'; " +
                "frame-src 'self' https: http:; " +
                "base-uri 'self'; " +
                "form-action 'self' https: http:;",
            ],
          },
        });
      },
    );
  }

  mainWindow.loadURL(startUrl);

  // Show window when ready to prevent visual flash
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();

    // Open DevTools in development
    if (isDev) {
      mainWindow.webContents.openDevTools();
    }
  });

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Emitted when the window is closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Handle window being minimized/restored on macOS
  if (process.platform === 'darwin') {
    mainWindow.on('minimize', () => {
      mainWindow.hide();
    });
  }
}

// This method will be called when Electron has finished initialization
app.whenReady().then(() => {
  createWindow();

  // On macOS, re-create window when dock icon is clicked
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    } else {
      mainWindow.show();
    }
  });
});

// Quit when all windows are closed, except on macOS
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Security: Prevent new window creation
app.on('web-contents-created', (event, contents) => {
  contents.on('new-window', (event, navigationUrl) => {
    event.preventDefault();
    shell.openExternal(navigationUrl);
  });
});

// Handle app being opened from finder on macOS
app.on('open-file', (event, path) => {
  event.preventDefault();
  // Handle file opening logic here
});

app.on('open-url', (event, url) => {
  event.preventDefault();
  // Handle URL opening logic here
});

// Set up application menu
const template = [
  {
    label: 'File',
    submenu: [
      {
        label: 'New Document',
        accelerator: 'CmdOrCtrl+N',
        click: () => {
          mainWindow.webContents.send('new-document');
        },
      },
      { type: 'separator' },
      {
        label: 'Open',
        accelerator: 'CmdOrCtrl+O',
        click: () => {
          dialog
            .showOpenDialog(mainWindow, {
              properties: ['openFile'],
              filters: [{ name: 'All Files', extensions: ['*'] }],
            })
            .then((result) => {
              if (!result.canceled) {
                mainWindow.webContents.send('open-file', result.filePaths[0]);
              }
            });
        },
      },
      { type: 'separator' },
      {
        label: 'Close Window',
        accelerator: process.platform === 'darwin' ? 'Cmd+W' : 'Ctrl+W',
        click: () => {
          mainWindow.close();
        },
      },
      {
        label: 'Quit',
        accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
        click: () => {
          app.quit();
        },
      },
    ],
  },
  {
    label: 'Edit',
    submenu: [
      { role: 'undo' },
      { role: 'redo' },
      { type: 'separator' },
      { role: 'cut' },
      { role: 'copy' },
      { role: 'paste' },
      { role: 'selectall' },
    ],
  },
  {
    label: 'View',
    submenu: [
      { role: 'reload' },
      { role: 'forcereload' },
      { role: 'toggledevtools' },
      { type: 'separator' },
      { role: 'resetzoom' },
      { role: 'zoomin' },
      { role: 'zoomout' },
      { type: 'separator' },
      { role: 'togglefullscreen' },
    ],
  },
  {
    label: 'Window',
    submenu: [{ role: 'minimize' }, { role: 'close' }],
  },
  {
    label: 'Help',
    submenu: [
      {
        label: 'About AntWrite',
        click: () => {
          dialog.showMessageBox(mainWindow, {
            type: 'info',
            title: 'About AntWrite',
            message: 'AntWrite - AI-Powered Writing Assistant',
            detail: 'Version 0.1.0\nBuilt with Next.js and Electron',
          });
        },
      },
    ],
  },
];

// macOS specific menu adjustments
if (process.platform === 'darwin') {
  template.unshift({
    label: app.getName(),
    submenu: [
      { role: 'about' },
      { type: 'separator' },
      { role: 'services', submenu: [] },
      { type: 'separator' },
      { role: 'hide' },
      { role: 'hideothers' },
      { role: 'unhide' },
      { type: 'separator' },
      { role: 'quit' },
    ],
  });

  // Window menu
  template[5].submenu = [
    { role: 'close' },
    { role: 'minimize' },
    { role: 'zoom' },
    { type: 'separator' },
    { role: 'front' },
  ];
}

const menu = Menu.buildFromTemplate(template);
Menu.setApplicationMenu(menu);

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  dialog.showErrorBox('Error', error.message);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// IPC handlers
ipcMain.handle('window-minimize', () => {
  mainWindow.minimize();
});

ipcMain.handle('window-maximize', () => {
  if (mainWindow.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow.maximize();
  }
});

ipcMain.handle('window-close', () => {
  mainWindow.close();
});

ipcMain.handle('window-is-maximized', () => {
  return mainWindow.isMaximized();
});

ipcMain.handle('dialog-open-file', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [{ name: 'All Files', extensions: ['*'] }],
  });
  return result;
});

ipcMain.handle('dialog-save-file', async (event, content, defaultPath) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath: defaultPath || 'untitled.txt',
    filters: [
      { name: 'Text Files', extensions: ['txt', 'md'] },
      { name: 'All Files', extensions: ['*'] },
    ],
  });

  if (!result.canceled && result.filePath) {
    const fs = require('fs').promises;
    await fs.writeFile(result.filePath, content, 'utf8');
    return result.filePath;
  }
  return null;
});

ipcMain.handle('get-version', () => {
  return app.getVersion();
});
