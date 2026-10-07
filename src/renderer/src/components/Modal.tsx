import { useEffect, useRef, type ReactNode } from 'react'

export function Modal(props: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  const closeRef = useRef<HTMLButtonElement>(null)

  // Fermeture au clavier : Échap referme le modal sans forcer un clic sur le
  // fond ou la croix. Le listener est actif tant que le modal est monté.
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        props.onClose()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [props.onClose])

  // Le focus atterrit sur la croix à l'ouverture : Tab et Entrée sortent
  // immédiatement, rien ne reste piégé derrière le modal.
  useEffect(() => {
    closeRef.current?.focus()
  }, [])

  return (
    <div className="modal-backdrop" onClick={props.onClose}>
      <div
        className={`modal ${props.wide ? 'wide' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={props.title}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="modal-header">
          <h3>{props.title}</h3>
          <button ref={closeRef} className="modal-close" onClick={props.onClose} aria-label="Fermer">
            ✕
          </button>
        </header>
        <div className="modal-body">{props.children}</div>
      </div>
    </div>
  )
}
