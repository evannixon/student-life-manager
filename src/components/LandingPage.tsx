'use client'
import { useEffect, useState, useRef } from 'react'
import dynamic from 'next/dynamic'
const BlobScene = dynamic(() => import('./BlobScene'), { ssr: false })

// ── Ripple Button ─────────────────────────────────────────────────────────────
function RippleButton({ children, onClick, primary = false, style }: {
  children: React.ReactNode; onClick?: () => void; primary?: boolean; style?: React.CSSProperties
}) {
  const ref = useRef<HTMLButtonElement>(null)
  const [ripples, setRipples] = useState<{ x: number; y: number; id: number }[]>([])

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    const btn = ref.current
    if (!btn) return
    const rect = btn.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const id = Date.now()
    setRipples(prev => [...prev, { x, y, id }])
    setTimeout(() => setRipples(prev => prev.filter(r => r.id !== id)), 700)
    onClick?.()
  }

  return (
    <button ref={ref} onClick={handleClick} style={{
      position: 'relative', overflow: 'hidden',
      padding: '13px 28px', borderRadius: 10, cursor: 'pointer',
      fontSize: 15, fontWeight: 700, fontFamily: 'inherit',
      border: primary ? '1px solid rgba(255,255,255,0.15)' : '1px solid #2a2a2a',
      background: primary ? '#fff' : 'transparent',
      color: primary ? '#000' : '#888',
      transition: 'background 0.15s, color 0.15s, transform 0.1s, box-shadow 0.15s',
      ...style,
    }}
      onMouseEnter={e => {
        const el = e.currentTarget
        if (primary) { el.style.background = '#f0f0f0'; el.style.boxShadow = '0 0 24px rgba(255,255,255,0.15)' }
        else { el.style.borderColor = '#444'; el.style.color = '#ccc' }
      }}
      onMouseLeave={e => {
        const el = e.currentTarget
        if (primary) { el.style.background = '#fff'; el.style.boxShadow = 'none' }
        else { el.style.borderColor = '#2a2a2a'; el.style.color = '#888' }
      }}
      onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.97)' }}
      onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
    >
      {ripples.map(r => (
        <span key={r.id} style={{
          position: 'absolute', borderRadius: '50%',
          width: 200, height: 200,
          left: r.x - 100, top: r.y - 100,
          background: primary ? 'rgba(0,0,0,0.12)' : 'rgba(167,139,250,0.2)',
          transform: 'scale(0)', pointerEvents: 'none',
          animation: 'ripple 0.7s cubic-bezier(0.4,0,0.2,1) forwards',
        }} />
      ))}
      {children}
    </button>
  )
}

// ── Shimmer skeleton ──────────────────────────────────────────────────────────
function Shimmer({ width, height, radius = 8 }: { width: string | number; height: number; radius?: number }) {
  return (
    <div style={{
      width, height, borderRadius: radius,
      background: 'linear-gradient(90deg, #0f0f0f 25%, #1a1a1a 50%, #0f0f0f 75%)',
      backgroundSize: '400px 100%',
      animation: 'shimmer 1.6s infinite linear',
    }} />
  )
}

// ── Animated counter ──────────────────────────────────────────────────────────
function AnimCounter({ target, suffix = '', prefix = '' }: { target: number; suffix?: string; prefix?: string }) {
  const [val, setVal] = useState(0)
  const [started, setStarted] = useState(false)
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !started) {
        setStarted(true)
        let start = 0
        const step = (ts: number) => {
          if (!start) start = ts
          const p = Math.min((ts - start) / 1000, 1)
          setVal(Math.round((1 - Math.pow(1 - p, 3)) * target))
          if (p < 1) requestAnimationFrame(step)
        }
        requestAnimationFrame(step)
      }
    }, { threshold: 0.5 })
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [target, started])

  return <span ref={ref}>{prefix}{val}{suffix}</span>
}

// ── Feature card with hover glow ──────────────────────────────────────────────
function FeatureCard({ icon, title, desc, glowColor }: { icon: string; title: string; desc: string; glowColor: string }) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: '#080808',
        border: `1px solid ${hovered ? glowColor + '55' : '#141414'}`,
        borderRadius: 16, padding: '20px 18px',
        transition: 'border-color 0.25s, transform 0.25s, box-shadow 0.25s',
        transform: hovered ? 'translateY(-3px)' : 'none',
        boxShadow: hovered ? `0 12px 40px ${glowColor}11` : 'none',
        cursor: 'default',
      }}
    >
      <div style={{ fontSize: 26, marginBottom: 12 }}>{icon}</div>
      <div style={{ fontSize: 15, fontWeight: 700, color: hovered ? '#fff' : '#e5e7eb', marginBottom: 7, transition: 'color 0.2s' }}>{title}</div>
      <div style={{ fontSize: 13, color: '#999', lineHeight: 1.65 }}>{desc}</div>
    </div>
  )
}

// ── Interactive App Preview ───────────────────────────────────────────────────
function AppPreview() {
  const [activeTab, setActiveTab] = useState(0)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setLoaded(true), 800)
    return () => clearTimeout(t)
  }, [])

  return (
    <div style={{
      background: '#080808', border: '1px solid #1a1a1a', borderRadius: 20,
      overflow: 'hidden', maxWidth: 300, margin: '0 auto',
      boxShadow: '0 40px 80px rgba(0,0,0,0.8), 0 0 0 1px #111',
    }}>
      {/* Status bar */}
      <div style={{ background: '#000', padding: '10px 16px', display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 10, color: '#777' }}>9:41</span>
        <div style={{ width: 60, height: 4, background: '#111', borderRadius: 99 }} />
        <span style={{ fontSize: 10, color: '#777' }}>●●</span>
      </div>

      {/* Header */}
      <div style={{ padding: '10px 14px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: '-0.02em' }}>
          <span style={{ color: '#a78bfa' }}>Student</span><span style={{ color: '#f0f0f0' }}>Life</span>
        </div>
        <div style={{ background: '#1a1033', border: '1px solid #a78bfa33', borderRadius: 999, padding: '3px 8px', display: 'flex', alignItems: 'center', gap: 4 }}>
          <div style={{ width: 5, height: 5, background: '#a78bfa', borderRadius: '50%', animation: 'pulse 2s infinite' }} />
          <span style={{ color: '#a78bfa', fontSize: 9, fontWeight: 600 }}>Live</span>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', padding: '8px 14px 0', borderBottom: '1px solid #111' }}>
        {['Dashboard', 'Keuangan', 'Tugas'].map((t, i) => (
          <button key={i} onClick={() => setActiveTab(i)} style={{
            flex: 1, padding: '6px 0', fontSize: 9, fontWeight: 600,
            background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
            color: activeTab === i ? '#a78bfa' : '#888',
            borderBottom: `2px solid ${activeTab === i ? '#a78bfa' : 'transparent'}`,
            transition: 'all 0.15s', position: 'relative', overflow: 'hidden',
          }}>{t}</button>
        ))}
      </div>

      {/* Content */}
      <div style={{ padding: 12, minHeight: 190 }}>
        {!loaded ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Shimmer width="100%" height={60} radius={10} />
            <Shimmer width="100%" height={36} radius={8} />
            <Shimmer width="80%" height={36} radius={8} />
            <Shimmer width="90%" height={36} radius={8} />
          </div>
        ) : activeTab === 0 ? (
          <>
            <div style={{ background: '#1a1033', border: '1px solid #a78bfa22', borderRadius: 10, padding: '10px 12px', marginBottom: 8, textAlign: 'center' }}>
              <div style={{ fontSize: 8, color: '#a78bfa88', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 3 }}>Saldo</div>
              <div style={{ fontSize: 20, fontWeight: 900, color: '#a78bfa', letterSpacing: '-0.03em' }}>Rp 427.000</div>
              <div style={{ height: 3, background: '#a78bfa22', borderRadius: 99, marginTop: 8, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: '53%', background: '#a78bfa', borderRadius: 99, animation: 'expandBar 1s ease forwards' }} />
              </div>
            </div>
            {[
              { icon: '🍱', name: 'Makan Siang', color: '#4ade80', amount: '15.000' },
              { icon: '🛵', name: 'Grab ke Kampus', color: '#60a5fa', amount: '12.000' },
            ].map((t, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 9px', background: '#0a0a0a', borderRadius: 7, marginBottom: 4, border: '1px solid #111', animation: `fadeUp 0.4s ease ${i * 0.1}s both` }}>
                <div style={{ display: 'flex', gap: 7, alignItems: 'center' }}>
                  <span style={{ fontSize: 13 }}>{t.icon}</span>
                  <span style={{ fontSize: 10, color: '#ccc', fontWeight: 500 }}>{t.name}</span>
                </div>
                <span style={{ fontSize: 10, color: '#f87171', fontWeight: 700 }}>−Rp {t.amount}</span>
              </div>
            ))}
          </>
        ) : activeTab === 1 ? (
          <>
            {[
              { label: 'Makan', pct: 42, color: '#4ade80' },
              { label: 'Transport', pct: 25, color: '#60a5fa' },
              { label: 'Jajan', pct: 20, color: '#fbbf24' },
            ].map((c, i) => (
              <div key={i} style={{ marginBottom: 10, animation: `fadeUp 0.4s ease ${i * 0.1}s both` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ color: '#888', fontSize: 10 }}>{c.label}</span>
                  <span style={{ color: c.color, fontSize: 10, fontWeight: 700 }}>{c.pct}%</span>
                </div>
                <div style={{ height: 4, background: '#111', borderRadius: 99, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${c.pct}%`, background: c.color, borderRadius: 99, animation: 'expandBar 0.8s cubic-bezier(0.4,0,0.2,1) forwards' }} />
                </div>
              </div>
            ))}
          </>
        ) : (
          <div style={{ display: 'flex', gap: 6 }}>
            {[
              { label: 'Todo', color: '#aaa', bg: '#111', items: ['UAS Pemweb', 'Laporan'] },
              { label: 'Jalan', color: '#fbbf24', bg: '#110e00', items: ['Tugas PBO'] },
              { label: 'Done', color: '#a78bfa', bg: '#0d0a1a', items: ['Proposal'] },
            ].map((col, i) => (
              <div key={i} style={{ flex: 1, background: col.bg, border: `1px solid ${col.color}22`, borderRadius: 8, padding: 6, animation: `fadeUp 0.4s ease ${i * 0.1}s both` }}>
                <div style={{ fontSize: 8, color: col.color, fontWeight: 700, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{col.label}</div>
                {col.items.map((item, j) => (
                  <div key={j} style={{ background: '#0a0a0a', borderRadius: 4, padding: '4px 5px', marginBottom: 3, fontSize: 8, color: col.color === '#a78bfa' ? '#666' : '#ccc', fontWeight: 500, textDecoration: col.label === 'Done' ? 'line-through' : 'none' }}>{item}</div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function LandingPage({ onGetStarted }: { onGetStarted: () => void }) {
  const [mouse, setMouse] = useState({ x: 0, y: 0 })
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const h = (e: MouseEvent) => setMouse({ x: e.clientX, y: e.clientY })
    window.addEventListener('mousemove', h)
    return () => window.removeEventListener('mousemove', h)
  }, [])

  const features = [
    { icon: '💰', title: 'Budget Tracker', desc: 'Catat pemasukan & pengeluaran, pantau saldo real-time.', glowColor: '#4ade80' },
    { icon: '🎯', title: 'Target Tabungan', desc: 'Set goal bulanan, lihat progress sampai target tercapai.', glowColor: '#a78bfa' },
    { icon: '📸', title: 'Scan Nota OCR', desc: 'Foto struk → harga & kategori terdeteksi otomatis.', glowColor: '#60a5fa' },
    { icon: '◈', title: 'Kanban Tugas', desc: 'Drag & drop tugas dari Todo → Jalan → Selesai.', glowColor: '#fbbf24' },
    { icon: '🔥', title: 'Danger Score', desc: 'Skor urgensi dihitung dari deadline + tingkat kesulitan.', glowColor: '#f87171' },
    { icon: '⚡', title: 'Realtime Sync', desc: 'Buka di HP & laptop barengan, data tersync otomatis.', glowColor: '#a78bfa' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: '#000', color: '#fff', fontFamily: "'Inter', system-ui, sans-serif", overflow: 'hidden' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { display: none; }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        @keyframes shimmer { 0%{background-position:-400px 0} 100%{background-position:400px 0} }
        @keyframes ripple { to{transform:scale(4);opacity:0} }
        @keyframes expandBar { from{width:0%} }
        @keyframes orbFloat { 0%,100%{transform:translateY(0) translateX(0)} 50%{transform:translateY(-20px) translateX(10px)} }
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        .fade1{animation:fadeUp 0.6s cubic-bezier(0.16,1,0.3,1) 0.1s both}
        .fade2{animation:fadeUp 0.6s cubic-bezier(0.16,1,0.3,1) 0.2s both}
        .fade3{animation:fadeUp 0.6s cubic-bezier(0.16,1,0.3,1) 0.32s both}
        .fade4{animation:fadeUp 0.6s cubic-bezier(0.16,1,0.3,1) 0.44s both}
        .fade5{animation:fadeUp 0.6s cubic-bezier(0.16,1,0.3,1) 0.56s both}
      `}</style>

      {/* Cursor spotlight */}
      {mounted && (
        <div style={{
          position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 1,
          background: `radial-gradient(400px circle at ${mouse.x}px ${mouse.y}px, rgba(167,139,250,0.055) 0%, transparent 65%)`,
        }} />
      )}

      {/* Grid */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.016) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.016) 1px,transparent 1px)',
        backgroundSize: '52px 52px',
      }} />

      {/* Ambient orbs */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
        {[
          { x: '8%', y: '12%', size: 380, color: '#a78bfa', d: 0 },
          { x: '72%', y: '55%', size: 280, color: '#60a5fa', d: 2.5 },
          { x: '-4%', y: '65%', size: 240, color: '#4ade80', d: 1.2 },
        ].map((o, i) => (
          <div key={i} style={{
            position: 'absolute', left: o.x, top: o.y,
            width: o.size, height: o.size, borderRadius: '50%',
            background: `radial-gradient(circle, ${o.color}18 0%, transparent 70%)`,
            filter: 'blur(36px)',
            animation: `orbFloat ${7 + o.d}s ease-in-out ${o.d}s infinite`,
          }} />
        ))}
      </div>

      {/* Navbar */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        padding: '0 24px', height: 58,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'rgba(0,0,0,0.78)', backdropFilter: 'blur(14px)',
        borderBottom: '1px solid #111',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 28, height: 28, background: '#1a1033', border: '1px solid #a78bfa44', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>🎓</div>
          <span style={{ fontWeight: 800, fontSize: 15, letterSpacing: '-0.02em' }}>
            <span style={{ color: '#a78bfa' }}>Student</span>Life
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <RippleButton onClick={onGetStarted}>Masuk</RippleButton>
          <RippleButton onClick={onGetStarted} primary>Mulai Gratis</RippleButton>
        </div>
      </nav>

      {/* Hero wrapper */}
      <div style={{ position: 'relative' }}>
      <div style={{
        position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: 700, height: 520, pointerEvents: 'none', zIndex: 1,
        maskImage: 'radial-gradient(ellipse 80% 70% at 50% 40%, black 40%, transparent 100%)',
        WebkitMaskImage: 'radial-gradient(ellipse 80% 70% at 50% 40%, black 40%, transparent 100%)',
      }}>
        <BlobScene />
      </div>

      {/* Hero */}
      <div style={{ position: 'relative', zIndex: 2, paddingTop: 128, paddingBottom: 56, paddingLeft: 24, paddingRight: 24, textAlign: 'center', maxWidth: 680, margin: '0 auto' }}>
        <div className="fade1" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: 999, padding: '5px 14px', marginBottom: 28, fontSize: 12, color: '#999' }}>
          <span style={{ width: 6, height: 6, background: '#a78bfa', borderRadius: '50%', display: 'inline-block', animation: 'pulse 2s infinite' }} />
          Realtime sync · Gratis untuk mahasiswa
        </div>

        <h1 className="fade2" style={{
          fontSize: 'clamp(36px, 8vw, 68px)', fontWeight: 900, lineHeight: 1.04,
          letterSpacing: '-0.044em', marginBottom: 20,
          background: 'linear-gradient(160deg, #fff 30%, #999 100%)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        }}>
          Manage hidup<br />mahasiswa kamu
        </h1>

        <p className="fade3" style={{ fontSize: 16, color: '#aaa', lineHeight: 1.75, marginBottom: 36, maxWidth: 440, margin: '0 auto 36px' }}>
          Catat pengeluaran, pantau deadline tugas, scan nota belanja — semua dalam satu app. Gratis, realtime, no ribet.
        </p>

        <div className="fade4" style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <RippleButton onClick={onGetStarted} primary style={{ fontSize: 15, padding: '14px 32px' }}>
            Mulai Sekarang →
          </RippleButton>
          <RippleButton onClick={onGetStarted} style={{ fontSize: 15, padding: '14px 28px' }}>
            Lihat Demo
          </RippleButton>
        </div>

        {/* Stats */}
        <div className="fade5" style={{ display: 'flex', justifyContent: 'center', gap: 44, marginTop: 52, flexWrap: 'wrap' }}>
          {[
            { target: 100, suffix: '%', label: 'Gratis selamanya' },
            { target: 2, suffix: 's', prefix: '<', label: 'Sync realtime' },
            { target: 6, suffix: ' fitur', label: 'Siap dipakai' },
          ].map((s, i) => (
            <div key={i} style={{ textAlign: 'center', animation: `fadeUp 0.6s ease ${0.6 + i * 0.1}s both` }}>
              <div style={{ fontSize: 26, fontWeight: 900, color: '#fff', letterSpacing: '-0.04em' }}>
                <AnimCounter target={s.target} suffix={s.suffix} prefix={s.prefix} />
              </div>
              <div style={{ fontSize: 12, color: '#888', marginTop: 3 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>
      </div>{/* end hero wrapper */}

      {/* App preview */}
      <div style={{ position: 'relative', zIndex: 2, maxWidth: 340, margin: '0 auto 80px', padding: '0 24px' }}>
        <AppPreview />
      </div>

      {/* Features */}
      <div style={{ position: 'relative', zIndex: 2, maxWidth: 860, margin: '0 auto', padding: '0 24px 80px' }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ fontSize: 11, color: '#999', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>Fitur</div>
          <h2 style={{ fontSize: 28, fontWeight: 900, letterSpacing: '-0.035em' }}>
            <span style={{ color: '#a78bfa' }}>Semua</span> yang kamu butuhkan
          </h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 10 }}>
          {features.map((f, i) => <FeatureCard key={i} {...f} />)}
        </div>
      </div>

      {/* CTA */}
      <div style={{ position: 'relative', zIndex: 2, textAlign: 'center', padding: '0 24px 80px' }}>
        <div style={{ maxWidth: 440, margin: '0 auto', background: '#080808', border: '1px solid #1a1a1a', borderRadius: 24, padding: '40px 32px' }}>
          <div style={{ width: 52, height: 52, margin: '0 auto 18px', position: 'relative' }}>
            <div style={{ width: '100%', height: '100%', borderRadius: '50%', border: '2px solid transparent', borderTopColor: '#a78bfa', borderRightColor: '#a78bfa44', animation: 'spin 2.5s linear infinite', position: 'absolute' }} />
            <div style={{ position: 'absolute', inset: 7, background: '#1a1033', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17 }}>🎓</div>
          </div>
          <h2 style={{ fontSize: 24, fontWeight: 900, letterSpacing: '-0.03em', marginBottom: 10 }}>Siap mulai?</h2>
          <p style={{ color: '#999', fontSize: 14, marginBottom: 22 }}>Gratis selamanya. Tidak perlu kartu kredit.</p>
          <RippleButton onClick={onGetStarted} primary style={{ fontSize: 15, padding: '13px 32px' }}>
            Buat Akun Gratis →
          </RippleButton>
        </div>
      </div>
    </div>
  )
}
