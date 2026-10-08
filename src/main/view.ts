import { BrowserWindow } from 'electron'
import { join } from 'path'

/**
 * Jeton de vue par webContents, jamais par ligne de commande : la ligne de
 * commande d'un process est lisible par tout programme local non privilegie
 * (Get-CimInstance Win32_Process, /proc/<pid>/cmdline), et ce jeton autorise le
 * WebSocket qui relaie clavier et souris du PC distant.
 */
const viewTokens = new Map<number, string>()

export function openAgentView(viewToken: string, label: string): void {
  const win = new BrowserWindow({
    title: `Venari · Vue distante — ${label}`,
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
      nodeIntegration: false
    }
  })

  const wcId = win.webContents.id
  viewTokens.set(wcId, viewToken)
  win.on('closed', () => {
    viewTokens.delete(wcId)
    // La page de vue se déconnecte elle-même (ws close → endSessionByViewToken).
  })

  win.on('ready-to-show', () => {
    win.show()
  })

  const devServerUrl = process.env['ELECTRON_RENDERER_URL']
  if (devServerUrl) {
    void win.loadURL(`${devServerUrl.replace(/\/$/, '')}/view.html`)
  } else {
    void win.loadFile(join(__dirname, '../renderer/view.html'))
  }
}

/** Rendif le jeton uniquement a une fenetre de vue qu'on a nous-memes ouverte. */
export function getViewTokenForSender(webContentsId: number): string | null {
  return viewTokens.get(webContentsId) ?? null
}