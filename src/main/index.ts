import { app, BrowserWindow } from 'electron'
import { join } from 'path'
import { restoreToken } from './app-state'
import { registerIpc } from './ipc'
import { registerProgramsIpc } from './ipc-programs'
import { registerDetailIpc } from './ipc-detail'
import { registerScanIpc } from './ipc-scan'
import { registerToolsIpc } from './ipc-tools'
import { registerMcpIpc, restoreAutostartMcp } from './ipc-mcp'
import { installSecurity } from './security'

const APP_ID = 'com.bountydesk.app'

let mainWindow: BrowserWindow | null = null

const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) {
        mainWindow.restore()
      }
      mainWindow.show()
      mainWindow.focus()
    }
  })

  void app.whenReady().then(() => {
    app.setAppUserModelId(APP_ID)
    installSecurity()
    restoreToken()
    registerIpc()
    registerProgramsIpc()
    registerDetailIpc()
    registerScanIpc()
    registerToolsIpc()
    registerMcpIpc()
    restoreAutostartMcp()
    mainWindow = createWindow()

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        mainWindow = createWindow()
      }
    })
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit()
    }
  })
}

function createWindow(): BrowserWindow {
  const window = new BrowserWindow({
    title: 'BountyDesk',
    width: 1120,
    height: 760,
    minWidth: 960,
    minHeight: 620,
    show: false,
    backgroundColor: '#0e1116',
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  window.on('ready-to-show', () => {
    window.show()
  })

  const devServerUrl = process.env['ELECTRON_RENDERER_URL']
  if (devServerUrl) {
    void window.loadURL(devServerUrl)
  } else {
    void window.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return window
}