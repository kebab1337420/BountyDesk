import type { ReactNode } from 'react'

export function Modal(props: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  return (
    <div className="modal-backdrop" onClick={props.onClose}>
      <div className={`modal ${props.wide ? 'wide' : ''}`} onClick={(e) => e.stopPropagation()}>
        <header className="modal-header">
          <h3>{props.title}</h3>
          <button className="link" onClick={props.onClose} aria-label="Fermer">
            ✕
          </button>
        </header>
        <div className="modal-body">{props.children}</div>
      </div>
    </div>
  )
}