'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(false)
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      if (res.ok) {
        router.push('/dashboard')
      } else {
        setError(true)
        setPassword('')
        setTimeout(() => inputRef.current?.focus(), 50)
      }
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#111827',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 20px',
    }}>
      {/* Logo */}
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <p className="font-mono-numbers" style={{
          fontSize: 36,
          fontWeight: 700,
          color: '#F59E0B',
          letterSpacing: '-1px',
          lineHeight: 1,
          marginBottom: 6,
        }}>
          godam
        </p>
        <p style={{
          fontSize: 14,
          color: '#374151',
          fontWeight: 500,
          letterSpacing: '0.05em',
        }}>
          माल
        </p>
      </div>

      {/* Card */}
      <div style={{
        background: '#FFFFFF',
        borderRadius: 16,
        padding: '32px 24px',
        width: '100%',
        maxWidth: 360,
        boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
      }}>
        <p style={{ fontSize: 20, fontWeight: 600, color: '#111827', marginBottom: 4 }}>
          Welcome back
        </p>
        <p style={{ fontSize: 13, color: '#6B7280', marginBottom: 24 }}>
          Enter your password to continue
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Password input */}
          <div style={{ position: 'relative' }}>
            <input
              ref={inputRef}
              type={showPw ? 'text' : 'password'}
              value={password}
              onChange={e => { setPassword(e.target.value); setError(false) }}
              placeholder="Password"
              autoComplete="current-password"
              style={{
                width: '100%',
                height: 48,
                border: error ? '1.5px solid #EF4444' : '1.5px solid #E5E7EB',
                borderRadius: 10,
                fontSize: 16,
                padding: '0 48px 0 16px',
                color: '#111827',
                background: '#FFFFFF',
                boxSizing: 'border-box',
                outline: 'none',
                transition: 'border-color 0.15s',
              }}
              onFocus={e => {
                if (!error) e.target.style.borderColor = '#F59E0B'
              }}
              onBlur={e => {
                if (!error) e.target.style.borderColor = '#E5E7EB'
              }}
            />
            <button
              type="button"
              onClick={() => setShowPw(v => !v)}
              style={{
                position: 'absolute',
                right: 14,
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 4,
                color: '#9CA3AF',
                display: 'flex',
                alignItems: 'center',
              }}
              tabIndex={-1}
            >
              {showPw ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          </div>

          {/* Error message */}
          <div style={{
            height: 18,
            overflow: 'hidden',
            transition: 'opacity 0.2s',
            opacity: error ? 1 : 0,
          }}>
            <p style={{ fontSize: 13, color: '#EF4444', margin: 0 }}>
              Incorrect password. Try again.
            </p>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || !password}
            style={{
              width: '100%',
              height: 48,
              background: loading || !password ? '#374151' : '#111827',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: 10,
              fontSize: 15,
              fontWeight: 600,
              cursor: loading || !password ? 'not-allowed' : 'pointer',
              transition: 'background 0.15s',
              marginTop: 4,
            }}
          >
            {loading ? 'Checking…' : 'Enter Godam'}
          </button>
        </form>
      </div>

      {/* Footer */}
      <p style={{
        marginTop: 32,
        fontSize: 12,
        color: '#374151',
        letterSpacing: '0.02em',
      }}>
        Godam by DataCortex IQ
      </p>
    </div>
  )
}

function EyeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

function EyeOffIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  )
}
