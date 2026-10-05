import { app, BrowserWindow, ipcMain, desktopCapturer, powerMonitor, Tray, Menu, nativeImage, Notification, screen } from 'electron';
import path from 'path';
import os from 'os';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let isQuitting = false;

// Determine platform
const platform = process.platform === 'win32' ? 'WINDOWS' : process.platform === 'darwin' ? 'MACOS' : 'LINUX';

function resolvePreloadPath(): string {
  return path.join(__dirname, 'preload.cjs');
}

function getIconPath(filename: string): string {
  const candidatePaths = [
    path.join(__dirname, '../public', filename),
    path.join(__dirname, '../dist', filename),
    path.join(__dirname, '..', filename),
    path.join(app.getAppPath(), 'public', filename),
    path.join(app.getAppPath(), 'dist', filename),
    path.join(process.resourcesPath, 'public', filename),
    path.join(process.resourcesPath, filename),
  ];
  for (const p of candidatePaths) {
    if (fs.existsSync(p)) return p;
  }
  return candidatePaths[0];
}

function createWindow() {
  const preload = resolvePreloadPath();
  console.log('[Main Process] Resolved preload path:', preload);

  const iconPath = getIconPath('icon.ico');
  const iconPngPath = getIconPath('icon.png');
  const windowIcon = nativeImage.createFromPath(fs.existsSync(iconPath) ? iconPath : iconPngPath);

  mainWindow = new BrowserWindow({
    width: 420,
    height: 700,
    minWidth: 380,
    minHeight: 580,
    maxWidth: 600,
    maxHeight: 900,
    center: true,
    show: true,
    frame: false,
    transparent: false,
    backgroundColor: '#ffffff',
    resizable: true,
    alwaysOnTop: false,
    icon: windowIcon,
    webPreferences: {
      preload,
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
    },
  });

  if (!windowIcon.isEmpty()) {
    mainWindow.setIcon(windowIcon);
  }

  // Enable F12 and Ctrl+Shift+I to toggle DevTools
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'F12' || (input.control && input.shift && input.key.toLowerCase() === 'i')) {
      mainWindow?.webContents.toggleDevTools();
    }
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
    mainWindow?.focus();
    mainWindow?.moveTop();
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html')).catch((err) => {
      console.error('Failed to load local HTML file:', err);
    });
  }

  // Handle window close event (from taskbar, Alt+F4, or window 'X')
  mainWindow.on('close', (event) => {
    if (isQuitting) {
      return;
    }
    event.preventDefault();
    if (mainWindow) {
      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      }
      mainWindow.show();
      mainWindow.focus();
      mainWindow.webContents.send('app:close-requested');
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createTray() {
  const trayIcon16 = getIconPath('icon-16.png');
  const trayIcon32 = getIconPath('icon-32.png');
  const trayIconPng = getIconPath('icon.png');
  const trayIconIco = getIconPath('icon.ico');

  let icon: Electron.NativeImage;
  if (fs.existsSync(trayIcon16)) {
    icon = nativeImage.createFromPath(trayIcon16);
  } else if (fs.existsSync(trayIcon32)) {
    icon = nativeImage.createFromPath(trayIcon32);
  } else if (fs.existsSync(trayIconPng)) {
    icon = nativeImage.createFromPath(trayIconPng).resize({ width: 16, height: 16 });
  } else if (fs.existsSync(trayIconIco)) {
    icon = nativeImage.createFromPath(trayIconIco).resize({ width: 16, height: 16 });
  } else {
    icon = nativeImage.createFromBuffer(
      Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAA7SURBVDhPY/wPBAwUACZGBgYGBkYmRgYGBiZGGBgYGBkZGBgYmBiBhg0cNYChBkA0Y0iG//8ZGBgYGBgABQ8LAe4t9nEAAAAASUVORK5CYII=',
        'base64'
      )
    );
  }

  tray = new Tray(icon);
  tray.setToolTip('TimeLogger Desktop Tracker');

  tray.on('click', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        if (mainWindow.isMinimized()) {
          mainWindow.restore();
        }
        mainWindow.focus();
      } else {
        mainWindow.show();
        mainWindow.focus();
      }
    }
  });

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Open TimeLogger',
      click: () => {
        mainWindow?.show();
        mainWindow?.focus();
      },
    },
    { type: 'separator' },
    {
      label: 'Quit TimeLogger',
      click: async () => {
        isQuitting = true;
        mainWindow?.webContents.send('app:emergency-stop', 'Tray Quit');
        await handleEmergencyShutdown('Tray Quit');
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);
  tray.on('double-click', () => {
    mainWindow?.show();
    mainWindow?.focus();
  });
}

// Emergency Failsafe Shutdown Handler
async function handleEmergencyShutdown(reason: string = 'App Exit / Shutdown') {
  try {
    const active = offlineDb.getActiveSession();
    if (active) {
      const now = new Date().toISOString();
      const startedAtMs = new Date(active.startedAt).getTime();
      const dur = Math.max(0, Math.floor((Date.now() - startedAtMs) / 1000));

      offlineDb.updateSession(active.localSessionId, {
        endedAt: now,
        durationSeconds: dur,
        status: 'COMPLETED',
      });

      offlineDb.addEvent({
        eventId: `emergency_stop_${Date.now()}`,
        localSessionId: active.localSessionId,
        serverSessionId: active.serverSessionId || null,
        eventType: 'SESSION_STOP',
        occurredAt: now,
        payload: {
          clientSessionId: active.localSessionId,
          sessionId: active.serverSessionId || active.localSessionId,
          startedAt: active.startedAt,
          endedAt: now,
          durationSeconds: dur,
          notes: `[Auto-saved on ${reason}]`,
        },
        syncStatus: 'PENDING',
        retries: 0,
        createdAt: now,
      });

      // Attempt fast HTTP stop in main process if online
      const creds = secureStorage.getCredentials();
      const serverUrl = creds?.serverUrl;
      const accessToken = creds?.tokens?.accessToken;
      const targetSessionId = active.serverSessionId;

      if (serverUrl && accessToken && targetSessionId && !targetSessionId.startsWith('offline_')) {
        const controller = new AbortController();
        setTimeout(() => controller.abort(), 2000);
        await fetch(`${serverUrl.replace(/\/+$/, '')}/agent/work-sessions/stop`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            sessionId: targetSessionId,
            durationSeconds: dur,
            endedAt: now,
            notes: `[Auto-saved on ${reason}]`,
          }),
          signal: controller.signal,
        }).catch(() => {});
      }
    }
  } catch (err) {
    console.error('[Main Process] Emergency shutdown error:', err);
  }
}

app.whenReady().then(() => {
  createWindow();
  createTray();

  // Listen for System Shutdown & Sleep Events
  powerMonitor.on('shutdown', () => {
    console.log('[System] PowerMonitor shutdown detected. Executing failsafe emergency stop.');
    mainWindow?.webContents.send('app:emergency-stop', 'System Shutdown');
    handleEmergencyShutdown('System Shutdown');
  });

  powerMonitor.on('suspend', () => {
    console.log('[System] PowerMonitor suspend/sleep detected.');
    mainWindow?.webContents.send('app:emergency-stop', 'System Suspend');
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    } else {
      mainWindow?.show();
      mainWindow?.focus();
    }
  });
});

app.on('before-quit', () => {
  isQuitting = true;
  mainWindow?.webContents.send('app:emergency-stop', 'App Quit');
  handleEmergencyShutdown('App Quit');
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// ==========================================
// IPC Handlers
// ==========================================

// Window Control Handlers
ipcMain.handle('window:minimize', () => {
  mainWindow?.minimize();
});

ipcMain.handle('window:maximize', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow?.maximize();
  }
});

ipcMain.handle('window:hide', () => {
  mainWindow?.hide();
});

ipcMain.handle('window:close', () => {
  mainWindow?.close();
});

ipcMain.handle('app:quit', async () => {
  isQuitting = true;
  app.quit();
});

ipcMain.handle('window:set-always-on-top', (_event, flag: boolean) => {
  mainWindow?.setAlwaysOnTop(flag);
  return mainWindow?.isAlwaysOnTop();
});

// Device Information
ipcMain.handle('device:get-info', () => {
  const hostname = os.hostname();
  const cpus = os.cpus();
  const cpuModel = cpus.length > 0 ? cpus[0].model : 'Generic CPU';
  const release = os.release();
  
  // Deterministic device ID based on hostname + username
  const machineId = `${hostname}-${os.userInfo().username}`.replace(/[^a-zA-Z0-9-]/g, '_');

  return {
    deviceIdentifier: machineId,
    deviceName: `${hostname} (${os.userInfo().username})`,
    platform,
    platformVersion: `${os.type()} ${release}`,
    appVersion: app.getVersion() || '1.0.0',
    cpuModel,
    totalMemoryGB: Math.round(os.totalmem() / (1024 * 1024 * 1024)),
  };
});

// Real System Idle Time Detection
ipcMain.handle('system:get-idle-seconds', () => {
  try {
    return powerMonitor.getSystemIdleTime();
  } catch {
    return 0;
  }
});

// Real Screen Capture using desktopCapturer
ipcMain.handle('system:capture-screenshot', async () => {
  try {
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.bounds;
    const scale = primaryDisplay.scaleFactor || 1;
    const captureWidth = Math.max(1280, Math.round(width * scale));
    const captureHeight = Math.max(720, Math.round(height * scale));

    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: { width: captureWidth, height: captureHeight },
      fetchWindowIcons: false,
    });

    if (sources.length === 0) {
      throw new Error('No display screen found');
    }

    const primarySource = sources.find((s) => s.display_id === `${primaryDisplay.id}`) || sources[0];
    const imageBuffer = primarySource.thumbnail.toJPEG(80);
    const dataUrl = primarySource.thumbnail.toDataURL();
    const size = primarySource.thumbnail.getSize();
    const base64 = imageBuffer.toString('base64');

    return {
      base64,
      dataUrl,
      width: size.width,
      height: size.height,
      fileSize: imageBuffer.length,
      mimeType: 'image/jpeg',
      capturedAt: new Date().toISOString(),
    };
  } catch (err: any) {
    console.error('Screenshot capture error:', err);
    throw err;
  }
});

// System Notifications
ipcMain.handle('system:notify', (_event, { title, body }: { title: string; body: string }) => {
  if (Notification.isSupported()) {
    new Notification({ title, body }).show();
  }
});

// Tray Status Updater
ipcMain.handle('tray:update-status', (_event, statusText: string) => {
  tray?.setToolTip(`TimeLogger: ${statusText}`);
});

// ==========================================
// Secure Credentials Storage IPC
// ==========================================
import { secureStorage } from './secure-storage';
import { offlineDb } from './offline-db';

ipcMain.handle('credentials:save', (_event, data: any) => {
  return secureStorage.saveCredentials(data);
});

ipcMain.handle('credentials:get', () => {
  return secureStorage.getCredentials();
});

ipcMain.handle('credentials:has', () => {
  return secureStorage.hasCredentials();
});

ipcMain.handle('credentials:clear', () => {
  return secureStorage.clearCredentials();
});

// ==========================================
// Offline Database IPC Handlers
// ==========================================
ipcMain.handle('offline-db:get-pending-count', () => {
  return offlineDb.getPendingCount();
});

ipcMain.handle('offline-db:save-session', (_event, session: any) => {
  return offlineDb.saveSession(session);
});

ipcMain.handle('offline-db:update-session', (_event, localSessionId: string, updates: any) => {
  return offlineDb.updateSession(localSessionId, updates);
});

ipcMain.handle('offline-db:get-active-session', (_event, employeeId?: string) => {
  return offlineDb.getActiveSession(employeeId);
});

ipcMain.handle('offline-db:get-pending-sessions', () => {
  return offlineDb.getPendingSessions();
});

ipcMain.handle('offline-db:mark-session-synced', (_event, localSessionId: string, serverSessionId: string) => {
  offlineDb.markSessionSynced(localSessionId, serverSessionId);
  return true;
});

ipcMain.handle('offline-db:add-event', (_event, event: any) => {
  return offlineDb.addEvent(event);
});

ipcMain.handle('offline-db:get-pending-events', () => {
  return offlineDb.getPendingEvents();
});

ipcMain.handle('offline-db:mark-event-synced', (_event, eventId: string) => {
  offlineDb.markEventSynced(eventId);
  return true;
});

ipcMain.handle('offline-db:increment-event-retry', (_event, eventId: string) => {
  offlineDb.incrementEventRetry(eventId);
  return true;
});

ipcMain.handle('offline-db:save-screenshot', (_event, metadata: any, base64Data: string) => {
  return offlineDb.saveScreenshot(metadata, base64Data);
});

ipcMain.handle('offline-db:get-pending-screenshots', () => {
  return offlineDb.getPendingScreenshots();
});

ipcMain.handle('offline-db:mark-screenshot-synced', (_event, localScreenshotId: string) => {
  offlineDb.markScreenshotSynced(localScreenshotId);
  return true;
});

ipcMain.handle('offline-db:clear-all', () => {
  offlineDb.clearAll();
  return true;
});

// ==========================================
// Connectivity Probe
// ==========================================
ipcMain.handle('connectivity:probe', async (_event, targetUrl: string) => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);
    const probeUrl = (targetUrl || '').replace(/\/+$/, '');
    
    // Try /health or base URL
    const res = await fetch(`${probeUrl}/health`, {
      method: 'GET',
      signal: controller.signal,
    }).catch(async () => {
      return await fetch(probeUrl, {
        method: 'GET',
        signal: controller.signal,
      });
    });
    clearTimeout(timeoutId);
    return res.status < 500;
  } catch {
    return false;
  }
});


