const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');

function createWindow() {
    Menu.setApplicationMenu(null);
    const win = new BrowserWindow({
        width: 1280,
        height: 800,
        autoHideMenuBar: true,
        icon: path.join(__dirname, '../public/logo.png'),
        webPreferences: { contextIsolation: true, nodeIntegration: false },
    });

    if (process.env.ELECTRON_DEV) {
        win.loadURL('http://localhost:5173');
        win.webContents.openDevTools({ mode: 'detach' });
    } else {
        win.loadFile(path.join(__dirname, '../dist/index.html'));
    }
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});