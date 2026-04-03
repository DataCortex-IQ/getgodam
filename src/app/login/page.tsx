'use client'
import { useEffect, useRef, useState, type CSSProperties, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const [shake, setShake] = useState(false)

  useEffect(() => { inputRef.current?.focus() }, [])

  async function handleSubmit(e: FormEvent) {
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
        setShake(true)
        setPassword('')
        setTimeout(() => { setShake(false); inputRef.current?.focus() }, 500)
      }
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      height: '100dvh',
      overflow: 'hidden',
      background: '#0F1117',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 20px',
      paddingTop: 'env(safe-area-inset-top)',
      paddingBottom: 'env(safe-area-inset-bottom)',
      position: 'relative',
    }}>
      {/* Ambient glow */}
      <div style={{
        position: 'absolute', top: '20%', left: '50%',
        transform: 'translateX(-50%)',
        width: 300, height: 300,
        background: 'radial-gradient(circle, rgba(245,158,11,0.08) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* Logo */}
      <div style={{ textAlign: 'center', marginBottom: 40, position: 'relative' }}>
        <div style={{
          width: 64, height: 64, borderRadius: 18,
          background: 'linear-gradient(135deg, #1A1D27 0%, #222637 100%)',
          border: '1px solid rgba(245,158,11,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 16px',
          boxShadow: '0 8px 32px rgba(245,158,11,0.15)',
        }}>
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <path d="M4 13L16 4l12 9v14a1 1 0 01-1 1H5a1 1 0 01-1-1V13z" fill="rgba(245,158,11,0.15)" stroke="#F59E0B" strokeWidth="1.5" />
            <rect x="10" y="16" width="5" height="11" rx="1" fill="#F59E0B" />
            <rect x="17" y="16" width="5" height="7" rx="1" fill="rgba(245,158,11,0.5)" />
          </svg>
        </div>
        <h1 className="font-mono-numbers" style={{ fontSize: 32, fontWeight: 700, color: '#F59E0B', letterSpacing: '-1px', lineHeight: 1, marginBottom: 6 }}>
          godam
        </h1>
        <p style={{ fontSize: 13, color: '#475569', letterSpacing: '0.1em' }}>TRADE · STOCK · ACCOUNTS</p>
      </div>

      {/* Card */}
      <div style={{
        background: '#1A1D27', borderRadius: 20,
        padding: '28px 24px', width: '100%', maxWidth: 360,
        border: '1px solid rgba(255,255,255,0.07)',
        boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        animation: shake ? 'shake 0.4s ease' : 'none',
      }}>
        <p style={{ fontSize: 18, fontWeight: 600, color: '#F1F5F9', marginBottom: 4 }}>Welcome back</p>
        <p style={{ fontSize: 13, color: '#475569', marginBottom: 24 }}>Enter your password to open Godam</p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ position: 'relative' }}>
            <input
              ref={inputRef}
              type={showPw ? 'text' : 'password'}
              value={password}
              onChange={e => { setPassword(e.target.value); setError(false) }}
              placeholder="Password"
              autoComplete="current-password"
              style={{
                width: '100%', height: 52,
                background: '#0F1117',
                border: error ? '1px solid rgba(244,63,94,0.6)' : '1px solid rgba(255,255,255,0.1)',
                borderRadius: 12, fontSize: 16,
                padding: '0 48px 0 16px', color: '#F1F5F9',
                boxSizing: 'border-box', outline: 'none',
              }}
              onFocus={e => { if (!error) { e.target.style.borderColor = 'rgba(245,158,11,0.5)'; e.target.style.boxShadow = '0 0 0 3px rgba(245,158,11,0.12)' } }}
              onBlur={e => { if (!error) { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; e.target.style.boxShadow = 'none' } }}
            />
            <button type="button" onClick={() => setShowPw(v => !v)} tabIndex={-1}
              style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#475569', padding: 4, display: 'flex', alignItems: 'center' }}>
              {showPw ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          </div>

          <div style={{ height: 20, overflow: 'hidden', opacity: error ? 1 : 0, transition: 'opacity 0.2s' }}>
            <p style={{ fontSize: 13, color: '#F43F5E', margin: 0 }}>✕ Incorrect password. Try again.</p>
          </div>

          <button type="submit" disabled={loading || !password} style={{
            width: '100%', height: 52,
            background: loading || !password ? '#222637' : '#F59E0B',
            color: loading || !password ? '#475569' : '#111827',
            border: loading || !password ? '1px solid rgba(255,255,255,0.07)' : 'none',
            borderRadius: 12, fontSize: 15, fontWeight: 700,
            cursor: loading || !password ? 'not-allowed' : 'pointer',
            transition: 'all 0.15s', marginTop: 4,
          }}>
            {loading ? 'Checking…' : 'Open Godam →'}
          </button>
        </form>
      </div>

      <PoweredByFooter />

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-8px); }
          40% { transform: translateX(8px); }
          60% { transform: translateX(-4px); }
          80% { transform: translateX(4px); }
        }
      `}</style>
    </div>
  )
}

/** Renders after mount so SSR + first client paint match (avoids hydration mismatch vs stale cached HTML). */
function PoweredByFooter() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  const rowStyle: CSSProperties = {
    marginTop: 40,
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    minHeight: 18,
  }

  if (!mounted) {
    return <div style={{ ...rowStyle, opacity: 0 }} aria-hidden />
  }

  return (
    <a
      href="https://www.datacortex.in"
      target="_blank"
      rel="noopener noreferrer"
      style={{
        ...rowStyle,
        textDecoration: 'none',
        opacity: 0.35,
      }}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
        <rect x="3" y="3" width="8" height="8" rx="1.5" fill="#94A3B8" />
        <rect x="13" y="3" width="8" height="8" rx="1.5" fill="#94A3B8" />
        <rect x="3" y="13" width="8" height="8" rx="1.5" fill="#94A3B8" />
        <rect x="13" y="13" width="8" height="8" rx="1.5" fill="#94A3B8" opacity="0.4" />
      </svg>
      <span style={{
        fontSize: 11,
        color: '#94A3B8',
        letterSpacing: '0.04em',
        fontWeight: 500,
      }}>
        Powered by DataCortex
      </span>
    </a>
  )
}

function EyeIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
}
function EyeOffIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
}
