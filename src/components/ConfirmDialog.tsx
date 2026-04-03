interface ConfirmDialogProps {
  open: boolean
  title?: string
  message: string
  onCancel: () => void
  onConfirm: () => void
  loading?: boolean
}

export default function ConfirmDialog({ open, title = 'Are you sure?', message, onCancel, onConfirm, loading }: ConfirmDialogProps) {
  if (!open) return null
  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
        padding: '0 0 env(safe-area-inset-bottom)',
      }}
      onClick={onCancel}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#1A1D27',
          borderRadius: '20px 20px 0 0',
          padding: '24px 20px 32px',
          width: '100%', maxWidth: 480,
          border: '1px solid rgba(255,255,255,0.07)',
          borderBottom: 'none',
        }}
      >
        <div style={{
          width: 36, height: 4, borderRadius: 2,
          background: 'rgba(255,255,255,0.15)',
          margin: '0 auto 20px',
        }} />
        <p style={{ fontSize: 17, fontWeight: 600, color: '#F1F5F9', marginBottom: 8 }}>{title}</p>
        <p style={{ fontSize: 14, color: '#475569', marginBottom: 24, lineHeight: 1.5 }}>{message}</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <button
            onClick={onCancel}
            style={{
              padding: '14px 0', borderRadius: 12,
              background: 'rgba(255,255,255,0.07)',
              color: '#94A3B8', border: '1px solid rgba(255,255,255,0.07)',
              fontSize: 15, fontWeight: 600, cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            style={{
              padding: '14px 0', borderRadius: 12,
              background: '#F43F5E', color: 'white', border: 'none',
              fontSize: 15, fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  )
}
