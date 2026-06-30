'use client'
import { useState, useRef } from 'react'

type ScannedItem = { name: string; price: number; category: string }
type Stage = 'upload' | 'scanning' | 'result' | 'error'

const CAT_LABELS: Record<string, { label: string; color: string; icon: string }> = {
  makan:     { label: 'Makan',     color: '#4ade80', icon: '🍱' },
  transport: { label: 'Transport', color: '#60a5fa', icon: '🛵' },
  kuliah:    { label: 'Kuliah',    color: '#c084fc', icon: '📄' },
  jajan:     { label: 'Jajan',     color: '#fbbf24', icon: '🧋' },
  lainnya:   { label: 'Lainnya',   color: '#f87171', icon: '💸' },
}

export default function ScanReceiptModal({
  onClose, onAdd, accent, accentBg, accentBdr,
}: {
  onClose: () => void
  onAdd: (items: ScannedItem[]) => void
  accent: string; accentBg: string; accentBdr: string
}) {
  const [stage, setStage] = useState<Stage>('upload')
  const [items, setItems] = useState<ScannedItem[]>([])
  const [errorMsg, setErrorMsg] = useState('')
  const [preview, setPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  const fileToBase64 = (file: File): Promise<{ base64: string; mimeType: string }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const result = reader.result as string
        const base64 = result.split(',')[1]
        resolve({ base64, mimeType: file.type })
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setErrorMsg('File harus berupa gambar')
      setStage('error')
      return
    }
    if (file.size > 8 * 1024 * 1024) {
      setErrorMsg('Ukuran gambar terlalu besar (maks 8MB)')
      setStage('error')
      return
    }

    setPreview(URL.createObjectURL(file))
    setStage('scanning')

    try {
      const { base64, mimeType } = await fileToBase64(file)
      const res = await fetch('/api/scan-receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64, mimeType }),
      })
      const data = await res.json()

      if (!res.ok) {
        setErrorMsg(data.error || 'Gagal memproses nota')
        setStage('error')
        return
      }

      setItems(data.items)
      setStage('result')
    } catch {
      setErrorMsg('Gagal terhubung ke server. Cek koneksi internet kamu.')
      setStage('error')
    }
  }

  const total = items.reduce((a, b) => a + b.price, 0)

  return (
    <div onClick={(e) => e.target === e.currentTarget && onClose()} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', display: 'flex',
      alignItems: 'flex-end', justifyContent: 'center', zIndex: 9998, backdropFilter: 'blur(8px)',
    }}>
      <div style={{
        background: '#0a0a0a', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 480,
        padding: 24, border: '1px solid #1a1a1a', borderBottom: 'none', maxHeight: '90vh', overflowY: 'auto',
      }}>
        <style>{`
          @keyframes scanPulse { 0%,100%{opacity:0.4} 50%{opacity:1} }
          @keyframes scanSweep { 0%{top:0%} 100%{top:100%} }
          @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
          @keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        `}</style>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <span style={{ color: '#f0f0f0', fontWeight: 700, fontSize: 16, letterSpacing: '-0.02em' }}>📸 Scan Nota</span>
          <button onClick={onClose} style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: 8, color: '#888', width: 30, height: 30, cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
        </div>

        {/* ── UPLOAD STAGE ── */}
        {stage === 'upload' && (
          <div>
            <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }}
              onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
            <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }}
              onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />

            <div onClick={() => cameraInputRef.current?.click()} style={{
              border: `2px dashed ${accentBdr}`, borderRadius: 16, padding: '36px 20px',
              textAlign: 'center', cursor: 'pointer', marginBottom: 10, transition: 'border-color 0.2s',
            }}
              onMouseEnter={e => e.currentTarget.style.borderColor = accent}
              onMouseLeave={e => e.currentTarget.style.borderColor = accentBdr}
            >
              <div style={{ fontSize: 36, marginBottom: 10 }}>📷</div>
              <div style={{ color: '#ccc', fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Foto Nota Langsung</div>
              <div style={{ color: '#555', fontSize: 12 }}>Buka kamera, ambil foto struk</div>
            </div>

            <button onClick={() => fileInputRef.current?.click()} style={{
              width: '100%', padding: '13px', background: 'transparent', border: '1px solid #1a1a1a',
              borderRadius: 12, color: '#888', fontWeight: 600, cursor: 'pointer', fontSize: 14, fontFamily: 'inherit',
            }}>
              📁 Upload dari Galeri
            </button>

            <div style={{ color: '#333', fontSize: 11, textAlign: 'center', marginTop: 14, lineHeight: 1.6 }}>
              Pastikan foto terang & tidak buram untuk hasil terbaik
            </div>
          </div>
        )}

        {/* ── SCANNING STAGE ── */}
        {stage === 'scanning' && (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            {preview && (
              <div style={{ position: 'relative', width: '100%', maxWidth: 220, margin: '0 auto 24px', borderRadius: 12, overflow: 'hidden', border: `1px solid ${accentBdr}` }}>
                <img src={preview} alt="preview" style={{ width: '100%', display: 'block', opacity: 0.6 }} />
                <div style={{
                  position: 'absolute', left: 0, right: 0, height: 2,
                  background: `linear-gradient(90deg, transparent, ${accent}, transparent)`,
                  animation: 'scanSweep 1.5s ease-in-out infinite',
                  boxShadow: `0 0 12px ${accent}`,
                }} />
              </div>
            )}
            <div style={{
              width: 36, height: 36, margin: '0 auto 16px', border: `3px solid ${accentBdr}`,
              borderTopColor: accent, borderRadius: '50%', animation: 'spin 0.8s linear infinite',
            }} />
            <div style={{ color: '#e5e7eb', fontWeight: 600, marginBottom: 6 }}>Gemini sedang membaca nota...</div>
            <div style={{ color: '#555', fontSize: 13 }}>Mendeteksi item, harga, dan kategori</div>
          </div>
        )}

        {/* ── RESULT STAGE ── */}
        {stage === 'result' && (
          <div>
            <div style={{ color: accent, fontSize: 13, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>✓</span> Berhasil mendeteksi {items.length} item
            </div>
            {items.map((item, i) => {
              const cat = CAT_LABELS[item.category] || CAT_LABELS.lainnya
              return (
                <div key={i} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '10px 14px', background: '#0f0f0f', borderRadius: 10, marginBottom: 8,
                  border: '1px solid #1a1a1a', animation: `fadeIn 0.3s ease ${i * 0.05}s both`,
                }}>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <span style={{ fontSize: 18 }}>{cat.icon}</span>
                    <div>
                      <div style={{ color: '#f0f0f0', fontSize: 14, fontWeight: 500 }}>{item.name}</div>
                      <span style={{ color: cat.color, fontSize: 11, fontWeight: 600 }}>{cat.label}</span>
                    </div>
                  </div>
                  <div style={{ color: '#f0f0f0', fontWeight: 700 }}>Rp {item.price.toLocaleString('id-ID')}</div>
                </div>
              )
            })}
            <div style={{
              display: 'flex', justifyContent: 'space-between', padding: '12px 14px',
              background: accentBg, border: `1px solid ${accentBdr}`, borderRadius: 10, marginTop: 4, marginBottom: 16,
            }}>
              <span style={{ color: accent, fontWeight: 700 }}>Total</span>
              <span style={{ color: accent, fontWeight: 700 }}>Rp {total.toLocaleString('id-ID')}</span>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => { setStage('upload'); setPreview(null); setItems([]) }} style={{
                flex: 1, padding: '13px', background: 'transparent', border: '1px solid #1a1a1a',
                borderRadius: 10, color: '#888', fontWeight: 600, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit',
              }}>Scan Ulang</button>
              <button onClick={() => onAdd(items)} style={{
                flex: 2, padding: '13px', background: accentBg, border: `1px solid ${accent}`,
                borderRadius: 10, color: accent, fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit',
              }}>
                Simpan Semua
              </button>
            </div>
          </div>
        )}

        {/* ── ERROR STAGE ── */}
        {stage === 'error' && (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: 36, marginBottom: 14 }}>😕</div>
            <div style={{ color: '#f87171', fontWeight: 600, marginBottom: 8, fontSize: 14 }}>Gagal memindai nota</div>
            <div style={{ color: '#666', fontSize: 13, marginBottom: 20, lineHeight: 1.6, padding: '0 12px' }}>{errorMsg}</div>
            <button onClick={() => { setStage('upload'); setPreview(null) }} style={{
              padding: '12px 28px', background: accentBg, border: `1px solid ${accent}`,
              borderRadius: 10, color: accent, fontWeight: 700, cursor: 'pointer', fontSize: 14, fontFamily: 'inherit',
            }}>Coba Lagi</button>
          </div>
        )}
      </div>
    </div>
  )
}
