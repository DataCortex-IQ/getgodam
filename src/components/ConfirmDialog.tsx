interface ConfirmDialogProps {
  open: boolean
  title?: string
  message: string
  onCancel: () => void
  onConfirm: () => void
  loading?: boolean
}

export default function ConfirmDialog({
  open,
  title = 'Are you sure?',
  message,
  onCancel,
  onConfirm,
  loading = false,
}: ConfirmDialogProps) {
  if (!open) return null

  return (
    <div
      onClick={onCancel}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        padding: '0 0 env(safe-area-inset-bottom)',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#FFFFFF',
          borderRadius: '16px 16px 0 0',
          width: '100%',
          maxWidth: 480,
          padding: '24px 20px 28px',
        }}
      >
        <p style={{ fontSize: 16, fontWeight: 700, color: '#111827', marginBottom: 6 }}>
          {title}
        </p>
        <p style={{ fontSize: 14, color: '#6B7280', marginBottom: 24 }}>
          {message}
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <button
            onClick={onCancel}
            disabled={loading}
            style={{
              padding: '13px 0', background: '#F3F4F6',
              color: '#374151', border: 'none', borderRadius: 10,
              fontSize: 14, fontWeight: 600, cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            style={{
              padding: '13px 0', background: '#EF4444',
              color: '#FFFFFF', border: 'none', borderRadius: 10,
              fontSize: 14, fontWeight: 700,
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
