'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'

type Mode = 'login' | 'register' | 'forgot'

export default function AuthForm({ onSuccess, onBack }: { onSuccess: (user: User) => void; onBack: () => void }) {
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [focused, setFocused] = useState<string | null>(null)

  const validateEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)
  const validatePassword = (p: string) => p.length >= 6

  const getPasswordStrength = (p: string) => {
    if (!p) return { score: 0, label: '', color: '' }
    let score = 0
    if (p.length >= 6) score++
    if (p.length >= 10) score++
    if (/[A-Z]/.test(p)) score++
    if (/[0-9]/.test(p)) score++
    if (/[^A-Za-z0-9]/.test(p)) score++
    if (score <= 1) return { score, label: 'Lemah', color: '#ef4444' }
    if (score <= 3) return { score, label: 'Sedang', color: '#f59e0b' }
    return { score, label: 'Kuat', color: '#22c55e' }
  }

  const pwStrength = getPasswordStrength(password)

  const handleSubmit = async () => {
    setError('')
    setSuccess('')

    if (!validateEmail(email)) return setError('Format email tidak valid')
    if (mode !== 'forgot' && !validatePassword(password)) return setError('Password minimal 6 karakter')
    if (mode === 'register' && password !== confirmPassword) return setError('Password tidak cocok')
    if (mode === 'register' && !name.trim()) return setError('Nama tidak boleh kosong')

    setLoading(true)
    try {
      if (mode === 'register') {
        const { data, error } = await supabase.auth.signUp({
          email, password,
          options: { data: { name } }
        })
        if (error) throw error
        if (data.user) {
          setSuccess('Akun berhasil dibuat! Silakan masuk.')
          setMode('login')
        }
      } else if (mode === 'login') {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) {
          if (error.message.includes('Invalid login')) throw new Error('Email atau password salah')
          throw error
        }
        if (data.user) onSuccess(data.user)
      } else if (mode === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(email)
        if (error) throw error
        setSuccess('Link reset password sudah dikirim ke email kamu!')
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan')
    } finally {
      setLoading(false)
    }
  }

  const inputBase: React.CSSProperties = {
    width: '100%', padding: '12px 14px', background: '#0a0a0a',
    border: '1px solid #1a1a1a', borderRadius: 10,
    color: '#e5e7eb', fontSize: 14, outline: 'none', display: 'block',
    transition: 'border-color 0.15s ease', fontFamily: 'inherit',
  }

  const inputFocused: React.CSSProperties = { borderColor: '#333' }

  return (
    <div style={{ minHeight: '100vh', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, fontFamily: "'Inter', system-ui, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; }
        input::placeholder { color: #333; }
        input:focus { border-color: #333 !important; }
        .submit-btn:hover:not(:disabled) { background: #e5e7eb !important; }
        .submit-btn { transition: all 0.15s ease; }
        .back-btn:hover { color: #666 !important; }
        .toggle-btn:hover { color: #fff !important; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        .form-wrap { animation: fadeUp 0.3s ease; }
      `}</style>

      <div className="form-wrap" style={{ width: '100%', maxWidth: 380 }}>

        {/* Back button */}
        <button onClick={onBack} className="back-btn" style={{
          background: '#0f0f0f', border: '1px solid #2a2a2a', borderRadius: 8,
          color: '#888', fontSize: 13, cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 6,
          marginBottom: 32, padding: '8px 14px', fontFamily: 'inherit', fontWeight: 500,
          width: 'fit-content',
        }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9 2L4 7L9 12" stroke="#888" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Kembali
        </button>

        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ width: 36, height: 36, background: '#fff', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, marginBottom: 20 }}>🎓</div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#fff', letterSpacing: '-0.03em', marginBottom: 6 }}>
            {mode === 'login' ? 'Selamat datang' : mode === 'register' ? 'Buat akun baru' : 'Reset password'}
          </h1>
          <p style={{ fontSize: 13, color: '#444' }}>
            {mode === 'login' ? 'Masuk ke akun StudentLife kamu' : mode === 'register' ? 'Gratis, setup dalam 30 detik' : 'Masukkan email untuk link reset'}
          </p>
        </div>

        {/* Success message */}
        {success && (
          <div style={{ background: '#0a1a0a', border: '1px solid #1a3a1a', borderRadius: 10, padding: '12px 14px', marginBottom: 16, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <span style={{ color: '#22c55e', fontSize: 14 }}>✓</span>
            <span style={{ color: '#86efac', fontSize: 13 }}>{success}</span>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div style={{ background: '#1a0a0a', border: '1px solid #3a1a1a', borderRadius: 10, padding: '12px 14px', marginBottom: 16, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <span style={{ color: '#ef4444', fontSize: 14 }}>!</span>
            <span style={{ color: '#fca5a5', fontSize: 13 }}>{error}</span>
          </div>
        )}

        {/* Form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

          {mode === 'register' && (
            <div>
              <label style={{ fontSize: 12, color: '#444', display: 'block', marginBottom: 6, fontWeight: 500 }}>Nama</label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Nama lengkap kamu"
                style={{ ...inputBase, ...(focused === 'name' ? inputFocused : {}) }}
                onFocus={() => setFocused('name')}
                onBlur={() => setFocused(null)}
              />
            </div>
          )}

          <div>
            <label style={{ fontSize: 12, color: '#444', display: 'block', marginBottom: 6, fontWeight: 500 }}>Email</label>
            <div style={{ position: 'relative' }}>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="nama@email.com"
                style={{
                  ...inputBase,
                  ...(focused === 'email' ? inputFocused : {}),
                  borderColor: email && !validateEmail(email) ? '#3a1a1a' : focused === 'email' ? '#333' : '#1a1a1a',
                  paddingRight: email ? 36 : 14,
                }}
                onFocus={() => setFocused('email')}
                onBlur={() => setFocused(null)}
              />
              {email && (
                <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: validateEmail(email) ? '#22c55e' : '#ef4444' }}>
                  {validateEmail(email) ? '✓' : '×'}
                </span>
              )}
            </div>
          </div>

          {mode !== 'forgot' && (
            <div>
              <label style={{ fontSize: 12, color: '#444', display: 'block', marginBottom: 6, fontWeight: 500 }}>Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Minimal 6 karakter"
                  onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                  style={{ ...inputBase, ...(focused === 'password' ? inputFocused : {}), paddingRight: 40 }}
                  onFocus={() => setFocused('password')}
                  onBlur={() => setFocused(null)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#333', fontSize: 13 }}
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
              {/* Password strength */}
              {mode === 'register' && password && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
                    {[1,2,3,4,5].map(i => (
                      <div key={i} style={{ flex: 1, height: 2, borderRadius: 99, background: i <= pwStrength.score ? pwStrength.color : '#1a1a1a', transition: 'background 0.2s' }} />
                    ))}
                  </div>
                  <div style={{ fontSize: 11, color: pwStrength.color }}>{pwStrength.label}</div>
                </div>
              )}
            </div>
          )}

          {mode === 'register' && (
            <div>
              <label style={{ fontSize: 12, color: '#444', display: 'block', marginBottom: 6, fontWeight: 500 }}>Konfirmasi Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Ulangi password"
                  onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                  style={{
                    ...inputBase,
                    ...(focused === 'confirm' ? inputFocused : {}),
                    borderColor: confirmPassword && password !== confirmPassword ? '#3a1a1a' : focused === 'confirm' ? '#333' : '#1a1a1a',
                    paddingRight: confirmPassword ? 36 : 14,
                  }}
                  onFocus={() => setFocused('confirm')}
                  onBlur={() => setFocused(null)}
                />
                {confirmPassword && (
                  <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: password === confirmPassword ? '#22c55e' : '#ef4444' }}>
                    {password === confirmPassword ? '✓' : '×'}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Forgot password link */}
          {mode === 'login' && (
            <div style={{ textAlign: 'right' }}>
              <button onClick={() => { setMode('forgot'); setError(''); setSuccess('') }} className="toggle-btn"
                style={{ background: 'none', border: 'none', color: '#333', fontSize: 12, cursor: 'pointer', padding: 0 }}>
                Lupa password?
              </button>
            </div>
          )}

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="submit-btn"
            style={{
              width: '100%', marginTop: 4, padding: '13px',
              background: loading ? '#111' : '#fff',
              border: '1px solid', borderColor: loading ? '#1a1a1a' : '#fff',
              borderRadius: 10, color: loading ? '#333' : '#000',
              fontWeight: 700, fontSize: 14, cursor: loading ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit', letterSpacing: '-0.01em',
            }}
          >
            {loading ? '...' : mode === 'login' ? 'Masuk' : mode === 'register' ? 'Buat Akun' : 'Kirim Link Reset'}
          </button>
        </div>

        {/* Toggle mode */}
        <p style={{ textAlign: 'center', marginTop: 24, color: '#333', fontSize: 13 }}>
          {mode === 'login' ? 'Belum punya akun? ' : mode === 'register' ? 'Sudah punya akun? ' : 'Ingat password? '}
          <button
            onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); setSuccess('') }}
            className="toggle-btn"
            style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontWeight: 600, fontSize: 13, fontFamily: 'inherit' }}
          >
            {mode === 'login' ? 'Daftar' : 'Masuk'}
          </button>
        </p>
      </div>
    </div>
  )
}
