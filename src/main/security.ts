import { app, session, shell } from 'electron'

const PROD_CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  // blob: est necessaire a la fenetre de vue distante, qui affiche l'ecran du PC
  // recu en WebSocket via URL.createObjectURL. En dev la page est servie en
  // http://localhost (donc same-origin) et le joker 'self' suffisait ; une fois
  // empaquetee en file://, 'self' ne couvre pas blob: et l'image etait refusee.
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
  "frame-ancestors 'none'",
  "object-src 'none'"
].join('; ')

export function installSecurity(): void {
  const dev = !app.isPackaged
  const devServerUrl = process.env['ELECTRON_RENDERER_URL']
  const csp = dev
    ? PROD_CSP.replace("connect-src 'none'", "connect-src 'self' ws://localhost:*")
    : PROD_CSP

  // L'app n'a besoin d'aucun droit natif : on refuse tout par defaut plutot que
  // d'accorder ce qu'Electron accorde par defaut (micro, geo, notifications, USB, HID...).
  session.defaultSession.setPermissionRequestHandler((_contents, _permission, callback) => {
    callback(false)
  })
  session.defaultSession.setPermissionCheckHandler(() => false)

  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [csp]
      }
    })
  })

  app.on('web-contents-created', (_event, contents) => {
    contents.setWindowOpenHandler(({ url }) => {
      if (url.startsWith('https://') || url.startsWith('http://')) {
        void shell.openExternal(url)
      }
      return { action: 'deny' }
    })

    contents.on('will-navigate', (event, url) => {
      const allowed = devServerUrl ? url.startsWith(devServerUrl) : url.startsWith('file://')
      if (!allowed) {
        event.preventDefault()
      }
    })
  })
}