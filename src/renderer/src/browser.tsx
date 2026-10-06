import React from 'react'
import ReactDOM from 'react-dom/client'

const HOME = 'https://duckduckgo.com'

function normalize(raw: string): string | null {
  const value = raw.trim()
  if (!value) return null
  const withScheme = /^[a-z]+:/i.test(value) ? value : 'https://' + value
  try {
    const url = new URL(withScheme)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
    return url.toString()
  } catch {
    return null
  }
}

function initialUrl(): string {
  const raw = new URLSearchParams(window.location.search).get('url')
  return normalize(raw ?? '') ?? HOME
}

function BrowserApp() {
  const start = React.useMemo(initialUrl, [])
  const [input, setInput] = React.useState(start)
  const [current, setCurrent] = React.useState(start)
  const [nonce, setNonce] = React.useState(0)
  const [error, setError] = React.useState<string | null>(null)

  const navigate = (raw: string) => {
    const url = normalize(raw)
    if (!url) {
      setError('URL invalide : seuls http et https sont acceptes.')
      return
    }
    setError(null)
    setInput(url)
    setCurrent(url)
    setNonce(0)
  }

  const go = () => {
    navigate(input)
  }

  const reload = () => {
    setCurrent(current)
    setNonce((n) => n + 1)
  }

  return (
    <div className="browser-shell">
      <div className="browser-bar">
        <input
          className="browser-url"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') go()
          }}
          placeholder="https://exemple.com"
          spellCheck={false}
        />
        <button type="button" onClick={go}>Aller</button>
        <button type="button" onClick={reload}>Recharger</button>
      </div>
      {error ? <p className="browser-error">{error}</p> : null}
      <iframe
        key={`${current}#${nonce}`}
        className="browser-frame"
        src={current}
        title="Navigateur Assistant"
        sandbox="allow-scripts allow-forms"
        referrerPolicy="no-referrer"
      />
    </div>
  )
}

const root = document.getElementById('root')
if (root) {
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <BrowserApp />
    </React.StrictMode>
  )
}