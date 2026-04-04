import { useEffect } from 'react'
import { X } from 'lucide-react'

export default function Modal({ open, title, subtitle, children, footer, onClose, width = 720 }) {
  useEffect(() => {
    if (!open || typeof document === 'undefined') return undefined

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [open])

  useEffect(() => {
    if (!open || typeof window === 'undefined') return undefined

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose?.()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  if (!open) return null

  const modalWidth = typeof width === 'number' ? `min(calc(100vw - 32px), ${width}px)` : width

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={{ ...styles.dialog, width: modalWidth }} onClick={event => event.stopPropagation()}>
        <div style={styles.header}>
          <div>
            <div style={styles.title}>{title}</div>
            {subtitle ? <div style={styles.subtitle}>{subtitle}</div> : null}
          </div>

          <button type="button" onClick={onClose} style={styles.closeBtn} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        <div style={styles.body}>{children}</div>
        {footer ? <div style={styles.footer}>{footer}</div> : null}
      </div>
    </div>
  )
}

const styles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(15, 23, 42, 0.62)',
    backdropFilter: 'blur(8px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    zIndex: 1000,
  },
  dialog: {
    background: 'white',
    borderRadius: 22,
    boxShadow: '0 30px 80px rgba(15, 23, 42, 0.28)',
    maxHeight: 'calc(100vh - 32px)',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 16,
    padding: '22px 24px 18px',
    borderBottom: '1px solid #e2e8f0',
  },
  title: {
    fontSize: 20,
    fontWeight: 800,
    color: '#0f172a',
  },
  subtitle: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 1.5,
    color: '#64748b',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    border: '1px solid #e2e8f0',
    background: '#f8fafc',
    color: '#475569',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    flexShrink: 0,
  },
  body: {
    padding: '22px 24px',
    overflowY: 'auto',
  },
  footer: {
    padding: '18px 24px 22px',
    borderTop: '1px solid #e2e8f0',
    background: '#f8fafc',
  },
}
