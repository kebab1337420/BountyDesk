import { useState, type FormEvent } from 'react'
import { Api } from '../api'

export function LoginScreen({ onLoggedIn }: { onLoggedIn: () => void }) {
  const [token, setToken] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const valid = token.trim().length >= 10

  const submit = async (event: FormEvent): Promise<void> => {
    event.preventDefault()
    if (!valid || busy) {
      return
    }
    setBusy(true)
    setError(null)
    const result = await Api.auth.validate(token.trim())
    setBusy(false)
    if (!result.ok) {
      setError(result.error ?? 'Échec inconnu de la validation.')
      return
    }
    onLoggedIn()
  }

  return (
    <div className="shell login">
      <form className="card" onSubmit={(event) => void submit(event)}>
        <h1>Venari</h1>
        <p className="muted">Colle ton Personal Access Token Intigriti (jamais stocké en clair, chiffré localement).</p>
        <input
          type="password"
          value={token}
          onChange={(event) => setToken(event.target.value)}
          placeholder="Jeton API Intigriti"
          autoFocus
          spellCheck={false}
          autoComplete="off"
        />
        {error && <p className="error">{error}</p>}
        <button type="submit" disabled={!valid || busy}>
          {busy ? (
            <>
              <span className="spinner" aria-hidden="true" /> Vérification…
            </>
          ) : (
            'Tester et se connecter'
          )}
        </button>
      </form>
    </div>
  )
}