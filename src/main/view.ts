import { BrowserWindow } from 'electron'
import { join } from 'path'

export function openAgentView(viewToken: string, label: string): void {
  const win = new BrowserWindow({
    title: `BountyDesk · Vue distante — ${label}`,
    width: 1280,
    height: 800,
    minWidth: 640,
    minHeight: 400,
    show: false,
    backgroundColor: '#0e1116',
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
      additionalArguments: [`--bountydesk-view-token=${viewToken}`]
    }
  })

  win.on('ready-to-show', () => {
    win.show()
  })
  win.on('closed', () => {
    // La page de vue se déconnecte elle-même (ws close → endSessionByViewToken).
  })

  const devServerUrl = process.env['ELECTRON_RENDERER_URL']
  if (devServerUrl) {
    void win.loadURL(`${devServerUrl.replace(/\/$/, '')}/view.html`)
  } else {
    void win.loadFile(join(__dirname, '../renderer/view.html'))
  }
}