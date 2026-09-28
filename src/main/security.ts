import { app, session, shell } from 'electron'

const PROD_CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
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