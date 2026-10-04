const { app, BrowserWindow, Menu, protocol, net } = require('electron');
const path = require('path');
const url = require('url');

protocol.registerSchemesAsPrivileged([
  { scheme: 'app2', privileges: { secure: true, standard: true, supportFetchAPI: true, corsEnabled: true, bypassCSP: true } }
]);

function createWindow() {
    Menu.setApplicationMenu(null);
    const win = new BrowserWindow({
        width: 1280,
        height: 800,
        autoHideMenuBar: true,
        icon: path.join(__dirname, '../web/build/icon.png'),
        webPreferences: { contextIsolation: true, nodeIntegration: false },
    });

    if (process.env.ELECTRON_DEV) {
        win.loadURL('http://localhost:5173');
        win.webContents.openDevTools({ mode: 'detach' });
    } else {
        win.loadURL('app2://local/index.html');
        win.webContents.session.clearCache();
    }

    win.webContents.on('console-message', (event, level, message, line, sourceId) => {
        const log = require('electron-log');
        log.info(`[RENDERER] ${message} (line ${line})`);
    });
}

app.whenReady().then(() => {
    // Automatically grant permissions for geolocation and camera
    const { session } = require('electron');
    session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
        const allowedPermissions = ['media', 'geolocation']; // media is for camera
        if (allowedPermissions.includes(permission)) {
            callback(true);
        } else {
            callback(false);
        }
    });

    protocol.handle('app2', async (request) => {
        const urlObj = new URL(request.url);
        let pathname = urlObj.pathname;
        if (pathname === '/' || !pathname) {
            pathname = '/index.html';
        }
        
        const normalizedPath = pathname.replace(/^\/+/, '');
        const filePath = path.join(__dirname, '../web/dist', decodeURIComponent(normalizedPath));
        const fileUrl = url.pathToFileURL(filePath).toString();
        
        try {
            const response = await net.fetch(fileUrl);
            const ext = path.extname(filePath).toLowerCase();
            let mimeType = response.headers.get('content-type') || 'application/octet-stream';
            
            if (ext === '.woff2') mimeType = 'font/woff2';
            else if (ext === '.woff') mimeType = 'font/woff';
            else if (ext === '.ttf') mimeType = 'font/ttf';
            
            const newHeaders = new Headers(response.headers);
            newHeaders.set('Content-Type', mimeType);
            newHeaders.set('Access-Control-Allow-Origin', '*');
            
            return new Response(response.body, {
                status: response.status,
                statusText: response.statusText,
                headers: newHeaders
            });
        } catch (error) {
            console.error('Protocol handle error:', error);
            return new Response('Not Found', { status: 404 });
        }
    });
    createWindow();
    
    // Check for updates if not in dev mode
    if (!process.env.ELECTRON_DEV) {
        const { autoUpdater } = require('electron-updater');
        const log = require('electron-log');
        log.transports.file.level = 'info';
        autoUpdater.logger = log;
        autoUpdater.checkForUpdatesAndNotify();
    }
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});
