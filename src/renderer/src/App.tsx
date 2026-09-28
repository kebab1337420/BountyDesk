import { useEffect, useState } from 'react'
import { Api } from './api'
import { LoginScreen } from './screens/Login'
import { ProgramsScreen } from './screens/Programs'
import { ToolsScreen } from './screens/Tools'
import { McpScreen } from './screens/Mcp'
import { SettingsScreen } from './screens/Settings'

type View = 'loading' | 'login' | 'app'

export type Section = 'programs' | 'tools' | 'mcp' | 'settings'

const NAV: { id: Section; label: string; icon: string }[] = [
  { id: 'programs', label: 'Programmes', icon: '★' },
  { id: 'tools', label: 'Outils', icon: '⚒' },
  { id: 'mcp', label: 'Assistant', icon: '✳' },
  { id: 'settings', label: 'Réglages', icon: '⚙' }
]

export function App() {
  const [view, setView] = useState<View>('loading')
  const [section, setSection] = useState<Section>('programs')

  useEffect(() => {
    void Api.auth.status().then((status) => {
      setView(status.configured ? 'app' : 'login')
    })
  }, [])

  const logout = (): void => {
    void Api.auth.logout()
    setView('login')
  }

  if (view === 'loading') {
    return (
      <div className="app">
        <p className="muted center" style={{ margin: 'auto' }}>
          Chargement…
        </p>
      </div>
    )
  }

  if (view === 'login') {
    return <LoginScreen onLoggedIn={() => setView('app')} />
  }

  return (
    <div className="app">
      <aside className="app-sidebar">
        <div className="app-brand">
          <span className="brand-mark">◮</span>
          <span className="brand-name">BountyDesk</span>
        </div>
        <nav className="nav">
          {NAV.map((item) => (
            <button
              key={item.id}
              className={`nav-item ${section === item.id ? 'active' : ''}`}
              onClick={() => setSection(item.id)}
            >
              <span className="nav-icon">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>
        <div className="app-sidebar-foot">
          <button className="nav-item" onClick={() => setSection('settings')}>
            <span className="nav-icon">🛡</span>
            Sécurité
          </button>
          <button className="nav-item" onClick={logout}>
            <span className="nav-icon">⏻</span>
            Se déconnecter
          </button>
        </div>
      </aside>
      <main className="app-main">
        {section === 'programs' && <ProgramsScreen />}
        {section === 'tools' && <ToolsScreen />}
        {section === 'mcp' && <McpScreen />}
        {section === 'settings' && <SettingsScreen onLogout={logout} />}
      </main>
    </div>
  )
}