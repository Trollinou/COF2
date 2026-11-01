import { app, BrowserWindow, ipcMain, dialog, Menu, MenuItemConstructorOptions } from 'electron';
import * as path from 'node:path';
import * as fs from 'node:fs';

let mainWindow: BrowserWindow | null = null;

function createApplicationMenu() {
  const isMac = process.platform === 'darwin';

  const template: MenuItemConstructorOptions[] = [
    ...(isMac
      ? [
          {
            label: app.name,
            submenu: [
              { role: 'about' as const },
              { type: 'separator' as const },
              { role: 'services' as const },
              { type: 'separator' as const },
              { role: 'hide' as const },
              { role: 'hideOthers' as const },
              { role: 'unhide' as const },
              { type: 'separator' as const },
              { role: 'quit' as const },
            ],
          },
        ]
      : []),
    {
      label: 'Fichier',
      submenu: [
        {
          label: 'Enregistrer le personnage',
          accelerator: 'CmdOrCtrl+S',
          click: () => {
            mainWindow?.webContents.send('menu-trigger-save');
          },
        },
        {
          label: 'Ouvrir un personnage...',
          accelerator: 'CmdOrCtrl+O',
          click: () => {
            mainWindow?.webContents.send('menu-trigger-load');
          },
        },
        {
          label: 'Exporter en PDF / Imprimer',
          accelerator: 'CmdOrCtrl+P',
          click: () => {
            mainWindow?.webContents.send('menu-trigger-pdf');
          },
        },
        { type: 'separator' },
        isMac ? { role: 'close' } : { role: 'quit' },
      ],
    },
    {
      label: 'Édition',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
      ],
    },
    {
      label: 'Affichage',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Fenêtre',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        ...(isMac
          ? [{ type: 'separator' as const }, { role: 'front' as const }]
          : [{ role: 'close' as const }]),
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

function createWindow() {
  const iconPath = app.isPackaged
    ? path.join(__dirname, '../dist/icon.png')
    : path.join(__dirname, '../public/icon.png');

  mainWindow = new BrowserWindow({
    width: 1300,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: 'COF2 - Compagnon & Fiche de Personnage',
    backgroundColor: '#1c1917',
    icon: fs.existsSync(iconPath) ? iconPath : undefined,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    if (process.env.DEVTOOLS === 'true') {
      mainWindow.webContents.openDevTools({ mode: 'detach' });
    }
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createApplicationMenu();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC: Atomic Non-blocking Save character to .cof2
ipcMain.handle('save-character-file', async (_event, { charData, defaultFilename }) => {
  if (!mainWindow) return { success: false, error: 'No active window' };

  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
    title: 'Sauvegarder le personnage COF2',
    defaultPath: defaultFilename || 'mon_personnage.cof2',
    filters: [
      { name: 'Personnage COF2 (*.cof2, *.json)', extensions: ['cof2', 'json'] },
    ],
  });

  if (canceled || !filePath) {
    return { success: false, canceled: true };
  }

  const tempPath = `${filePath}.tmp_${Date.now()}`;
  try {
    const payload = JSON.stringify(charData, null, 2);
    await fs.promises.writeFile(tempPath, payload, 'utf-8');
    await fs.promises.rename(tempPath, filePath);
    return { success: true, filePath };
  } catch (err: any) {
    try {
      if (fs.existsSync(tempPath)) {
        await fs.promises.unlink(tempPath);
      }
    } catch {
      // ignore cleanup error
    }
    return { success: false, error: err.message };
  }
});

// IPC: Non-blocking Open character .cof2
ipcMain.handle('load-character-file', async () => {
  if (!mainWindow) return { success: false, error: 'No active window' };

  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    title: 'Ouvrir un personnage COF2',
    filters: [
      { name: 'Personnage COF2 (*.cof2, *.json)', extensions: ['cof2', 'json'] },
    ],
    properties: ['openFile'],
  });

  if (canceled || filePaths.length === 0) {
    return { success: false, canceled: true };
  }

  try {
    const raw = await fs.promises.readFile(filePaths[0], 'utf-8');
    const data = JSON.parse(raw);
    return { success: true, data, filePath: filePaths[0] };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});

// IPC: Atomic Non-blocking Export PDF
ipcMain.handle('export-character-pdf', async (_event, { defaultFilename }) => {
  if (!mainWindow) return { success: false, error: 'No active window' };

  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
    title: 'Exporter la fiche en PDF',
    defaultPath: defaultFilename || 'Fiche_COF2.pdf',
    filters: [{ name: 'Document PDF (*.pdf)', extensions: ['pdf'] }],
  });

  if (canceled || !filePath) {
    return { success: false, canceled: true };
  }

  const tempPath = `${filePath}.tmp_${Date.now()}`;
  try {
    const pdfData = await mainWindow.webContents.printToPDF({
      pageSize: 'A4',
      printBackground: true,
      landscape: false,
      margins: {
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
      },
    });

    await fs.promises.writeFile(tempPath, pdfData);
    await fs.promises.rename(tempPath, filePath);
    return { success: true, filePath };
  } catch (err: any) {
    try {
      if (fs.existsSync(tempPath)) {
        await fs.promises.unlink(tempPath);
      }
    } catch {
      // ignore cleanup error
    }
    return { success: false, error: err.message };
  }
});
