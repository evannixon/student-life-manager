'use client'
import { useState, useRef } from 'react'
import type { User } from '@supabase/supabase-js'
import { useTransactions, type Transaction } from '@/lib/hooks/useTransactions'
import { useTasks, type Task } from '@/lib/hooks/useTasks'
import { useIncome, type Income } from '@/lib/hooks/useIncome'
import { useSavingsGoal } from '@/lib/hooks/useSavingsGoal'
import { supabase } from '@/lib/supabase'
import KanbanBoard from '@/components/KanbanBoard'
import ScanReceiptModal from '@/components/ScanReceiptModal'

// ── Theme ─────────────────────────────────────────────────────────────────────
const T = {
  bg: '#000', surface: '#0a0a0a', border: '#1e1e1e',
  text: '#f0f0f0', muted: '#888', faint: '#555',
  accent: '#a78bfa', accentBg: '#1a1033', accentBdr: '#a78bfa33',
  danger: '#f87171', warn: '#fbbf24', success: '#4ade80',
}

// ── Ripple Button ─────────────────────────────────────────────────────────────
function RippleBtn({ children, onClick, variant = 'ghost', style }: {
  children: React.ReactNode
  onClick?: () => void
  variant?: 'ghost' | 'accent' | 'danger' | 'success' | 'warn' | 'submit'
  style?: React.CSSProperties
}) {
  const ref = useRef<HTMLButtonElement>(null)
  const [ripples, setRipples] = useState<{ x: number; y: number; id: number }[]>([])

  const colors = {
    ghost:   { bg: 'transparent',  border: T.border,       color: T.muted,   ripple: 'rgba(255,255,255,0.08)' },
    accent:  { bg: T.accentBg,     border: T.accent,       color: T.accent,  ripple: 'rgba(167,139,250,0.25)' },
    danger:  { bg: '#1a0505',      border: '#f8717144',    color: T.danger,  ripple: 'rgba(248,113,113,0.2)'  },
    success: { bg: '#051305',      border: '#4ade8044',    color: T.success, ripple: 'rgba(74,222,128,0.2)'   },
    warn:    { bg: '#130f00',      border: '#fbbf2444',    color: T.warn,    ripple: 'rgba(251,191,36,0.2)'   },
    submit:  { bg: '#fff',         border: '#fff',         color: '#000',    ripple: 'rgba(0,0,0,0.1)'        },
  }
  const c = colors[variant]

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    const btn = ref.current
    if (!btn) return
    const rect = btn.getBoundingClientRect()
    const id = Date.now()
    setRipples(prev => [...prev, { x: e.clientX - rect.left, y: e.clientY - rect.top, id }])
    setTimeout(() => setRipples(prev => prev.filter(r => r.id !== id)), 600)
    onClick?.()
  }

  return (
    <button ref={ref} type="button" onClick={handleClick} style={{
      position: 'relative', overflow: 'hidden',
      background: c.bg, border: `1px solid ${c.border}`, color: c.color,
      borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit',
      fontWeight: 600, fontSize: 14, padding: '10px 16px',
      transition: 'transform 0.1s, opacity 0.15s, box-shadow 0.15s',
      ...style,
    }}
      onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.96)' }}
      onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)' }}
    >
      {ripples.map(r => (
        <span key={r.id} style={{
          position: 'absolute', borderRadius: '50%',
          width: 180, height: 180, left: r.x - 90, top: r.y - 90,
          background: c.ripple, transform: 'scale(0)', pointerEvents: 'none',
          animation: 'rippleFx 0.6s cubic-bezier(0.4,0,0.2,1) forwards',
        }} />
      ))}
      {children}
    </button>
  )
}

const EXPENSE_CATS: Record<string, { bg: string; accent: string; label: string; icon: string }> = {
  makan:     { bg: '#0a1a0a', accent: '#4ade80', label: 'Makan',     icon: '🍱' },
  transport: { bg: '#0a0f1a', accent: '#60a5fa', label: 'Transport', icon: '🛵' },
  kuliah:    { bg: '#160a1a', accent: '#c084fc', label: 'Kuliah',    icon: '📄' },
  jajan:     { bg: '#1a160a', accent: '#fbbf24', label: 'Jajan',     icon: '🧋' },
  lainnya:   { bg: '#1a0a0a', accent: '#f87171', label: 'Lainnya',   icon: '💸' },
}

const INCOME_CATS: Record<string, { bg: string; accent: string; label: string; icon: string }> = {
  beasiswa:  { bg: '#0f0a1a', accent: '#a78bfa', label: 'Beasiswa',  icon: '🎓' },
  magang:    { bg: '#0a1a0a', accent: '#4ade80', label: 'Magang',    icon: '💼' },
  kerja:     { bg: '#0a0f1a', accent: '#60a5fa', label: 'Kerja',     icon: '👔' },
  ortu:      { bg: '#1a160a', accent: '#fbbf24', label: 'Uang Ortu', icon: '🏠' },
  lainnya:   { bg: '#1a0a0a', accent: '#f87171', label: 'Lainnya',   icon: '💵' },
}

function calcDanger(deadline: string, difficulty: number) {
  const days = Math.ceil((new Date(deadline).getTime() - Date.now()) / 86400000)
  return Math.min(99, Math.max(0, Math.round((100 - days * 10) + difficulty * 5)))
}

// ── Small components ──────────────────────────────────────────────────────────
function Chip({ bg, color, border, children }: { bg: string; color: string; border: string; children: React.ReactNode }) {
  return <span style={{ background: bg, color, border: `1px solid ${border}`, padding: '3px 9px', borderRadius: 999, fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>{children}</span>
}

function DangerBadge({ score, status }: { score: number; status: string }) {
  if (status === 'done') return <Chip bg={T.accentBg} color={T.accent} border={T.accentBdr}>✓ Selesai</Chip>
  if (score >= 80) return <Chip bg="#1a0a0a" color={T.danger} border="#f8717133">🔥 {score}</Chip>
  if (score >= 50) return <Chip bg="#1a130a" color={T.warn} border="#fbbf2433">⚠ {score}</Chip>
  return <Chip bg="#0a1a0a" color={T.success} border="#4ade8033">✓ {score}</Chip>
}

// ── Modal ─────────────────────────────────────────────────────────────────────
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 9998, backdropFilter: 'blur(8px)' }}>
      <div style={{ background: T.surface, borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 480, padding: 24, border: `1px solid ${T.border}`, borderBottom: 'none', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <span style={{ color: T.text, fontWeight: 700, fontSize: 16, letterSpacing: '-0.02em' }}>{title}</span>
          <button onClick={onClose} style={{ background: '#111', border: `1px solid ${T.border}`, borderRadius: 8, color: T.muted, width: 30, height: 30, cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit' }}>×</button>
        </div>
        {children}
      </div>
    </div>
  )
}

function ConfirmDelete({ label, onConfirm, onCancel }: { label: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 24, backdropFilter: 'blur(8px)' }}>
      <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 16, padding: 24, maxWidth: 300, width: '100%', textAlign: 'center' }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>🗑</div>
        <div style={{ color: T.text, fontWeight: 700, fontSize: 15, marginBottom: 8 }}>Hapus ini?</div>
        <div style={{ color: T.muted, fontSize: 13, marginBottom: 20 }}><span style={{ color: T.accent }}>"{label}"</span> akan dihapus permanen.</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onCancel} style={ghostBtn}>Batal</button>
          <button onClick={onConfirm} style={{ ...ghostBtn, borderColor: T.danger + '55', color: T.danger, flex: 1 }}>Hapus</button>
        </div>
      </div>
    </div>
  )
}

// ── Form styles ───────────────────────────────────────────────────────────────
const inp: React.CSSProperties = { width: '100%', padding: '11px 14px', marginBottom: 10, background: '#050505', border: `1px solid ${T.border}`, borderRadius: 10, color: T.text, fontSize: 14, outline: 'none', display: 'block', fontFamily: 'inherit' }
const ghostBtn: React.CSSProperties = { flex: 1, padding: '11px', background: 'transparent', border: `1px solid ${T.border}`, borderRadius: 10, color: T.muted, fontWeight: 600, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }
const primaryBtn = (disabled = false): React.CSSProperties => ({
  flex: 2, padding: '12px', background: disabled ? T.surface : T.accentBg,
  border: `1px solid ${disabled ? T.border : T.accent}`,
  borderRadius: 10, color: disabled ? T.faint : T.accent,
  fontWeight: 700, fontSize: 14, cursor: disabled ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
})
const labelSt: React.CSSProperties = { fontSize: 12, color: T.muted, display: 'block', marginBottom: 5, fontWeight: 500 }

// ── Category pill selector ────────────────────────────────────────────────────
function CatPills({ cats, selected, onSelect }: { cats: Record<string, { bg: string; accent: string; label: string }>; selected: string; onSelect: (k: string) => void }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
      {Object.entries(cats).map(([key, val]) => (
        <button key={key} onClick={() => onSelect(key)} style={{
          padding: '7px 14px', borderRadius: 999, border: '1px solid',
          borderColor: selected === key ? val.accent : T.border,
          background: selected === key ? val.bg : 'transparent',
          color: selected === key ? val.accent : T.muted,
          cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'inherit', transition: 'all 0.15s',
        }}>{val.label}</button>
      ))}
    </div>
  )
}

// ── Rupiah input ──────────────────────────────────────────────────────────────
function RupiahInput({ value, onChange, color = T.accent }: { value: string; onChange: (v: string) => void; color?: string }) {
  return (
    <div style={{ position: 'relative' }}>
      <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color, fontWeight: 700, fontSize: 14, pointerEvents: 'none' }}>Rp</span>
      <input
        type="text" inputMode="numeric"
        value={value ? parseInt(value).toLocaleString('id-ID') : ''}
        onChange={e => onChange(e.target.value.replace(/\./g, '').replace(/[^0-9]/g, ''))}
        placeholder="0"
        style={{ ...inp, paddingLeft: 42, fontSize: 22, fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 0 }}
      />
    </div>
  )
}

// ── Transaction Form ──────────────────────────────────────────────────────────
function TxForm({ initial, onSave, onClose, saving }: { initial?: Partial<Transaction>; onSave: (d: { name: string; amount: number; category: string; icon: string }) => void; onClose: () => void; saving: boolean }) {
  const [name, setName] = useState(initial?.name ?? '')
  const [amount, setAmount] = useState(initial?.amount?.toString() ?? '')
  const [category, setCategory] = useState(initial?.category ?? 'makan')
  const valid = !!name && !!amount
  return (
    <>
      <div style={{ marginBottom: 4 }}><label style={labelSt}>Nama pengeluaran</label><input value={name} onChange={e => setName(e.target.value)} placeholder="contoh: Makan siang warteg" style={inp} /></div>
      <div style={{ marginBottom: 4 }}><label style={labelSt}>Jumlah</label><RupiahInput value={amount} onChange={setAmount} color={T.danger} /></div>
      <div style={{ marginBottom: 16, marginTop: 10 }}><label style={labelSt}>Kategori</label><CatPills cats={EXPENSE_CATS} selected={category} onSelect={setCategory} /></div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={onClose} style={ghostBtn}>Batal</button>
        <button onClick={() => valid && onSave({ name, amount: parseInt(amount), category, icon: EXPENSE_CATS[category].icon })} disabled={saving || !valid} style={primaryBtn(saving || !valid)}>{saving ? '...' : initial?.id ? 'Simpan' : 'Tambah'}</button>
      </div>
    </>
  )
}

// ── Income Form ───────────────────────────────────────────────────────────────
function IncomeForm({ onSave, onClose, saving }: { onSave: (d: { name: string; amount: number; category: string; icon: string }) => void; onClose: () => void; saving: boolean }) {
  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('magang')
  const valid = !!name && !!amount
  return (
    <>
      <div style={{ marginBottom: 4 }}><label style={labelSt}>Sumber pendapatan</label><input value={name} onChange={e => setName(e.target.value)} placeholder="contoh: Gaji magang Juli" style={inp} /></div>
      <div style={{ marginBottom: 4 }}><label style={labelSt}>Jumlah</label><RupiahInput value={amount} onChange={setAmount} color={T.success} /></div>
      <div style={{ marginBottom: 16, marginTop: 10 }}><label style={labelSt}>Kategori</label><CatPills cats={INCOME_CATS} selected={category} onSelect={setCategory} /></div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={onClose} style={ghostBtn}>Batal</button>
        <button onClick={() => valid && onSave({ name, amount: parseInt(amount), category, icon: INCOME_CATS[category].icon })} disabled={saving || !valid} style={{ ...primaryBtn(saving || !valid), borderColor: valid ? T.success : T.border, color: valid ? T.success : T.faint, background: valid ? '#0a1a0a' : T.surface }}>{saving ? '...' : 'Tambah'}</button>
      </div>
    </>
  )
}

// ── Task Form ─────────────────────────────────────────────────────────────────
function TaskForm({ initial, onSave, onClose, saving }: { initial?: Partial<Task>; onSave: (d: { title: string; subject: string; deadline: string; difficulty: number; danger_score: number }) => void; onClose: () => void; saving: boolean }) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [subject, setSubject] = useState(initial?.subject ?? '')
  const [deadline, setDeadline] = useState(initial?.deadline ?? '')
  const [difficulty, setDifficulty] = useState(initial?.difficulty ?? 3)
  const danger = deadline ? calcDanger(deadline, difficulty) : 0
  const valid = !!title && !!subject && !!deadline
  return (
    <>
      <div style={{ marginBottom: 4 }}><label style={labelSt}>Nama tugas</label><input value={title} onChange={e => setTitle(e.target.value)} placeholder="contoh: UAS Pemweb" style={inp} /></div>
      <div style={{ marginBottom: 4 }}><label style={labelSt}>Mata kuliah</label><input value={subject} onChange={e => setSubject(e.target.value)} placeholder="contoh: Jarkom" style={inp} /></div>
      <div style={{ marginBottom: 4 }}><label style={labelSt}>Deadline</label><input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} style={inp} /></div>
      <div style={{ marginBottom: deadline ? 10 : 16 }}>
        <label style={labelSt}>Tingkat kesulitan</label>
        <div style={{ display: 'flex', gap: 6 }}>
          {[1,2,3,4,5].map(d => (
            <button key={d} onClick={() => setDifficulty(d)} style={{
              flex: 1, padding: '9px 0', borderRadius: 8, border: '1px solid',
              borderColor: difficulty >= d ? T.accent : T.border,
              background: difficulty >= d ? T.accentBg : '#050505',
              color: difficulty >= d ? T.accent : T.faint,
              cursor: 'pointer', fontWeight: 800, fontSize: 13, fontFamily: 'inherit', transition: 'all 0.15s',
            }}>{d}</button>
          ))}
        </div>
      </div>
      {deadline && (
        <div style={{ background: '#050505', border: `1px solid ${T.border}`, borderRadius: 10, padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <span style={{ color: T.muted, fontSize: 13 }}>Danger Score prediksi</span>
          <DangerBadge score={danger} status="todo" />
        </div>
      )}
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={onClose} style={ghostBtn}>Batal</button>
        <button onClick={() => valid && onSave({ title, subject, deadline, difficulty, danger_score: danger })} disabled={saving || !valid} style={primaryBtn(saving || !valid)}>{saving ? '...' : initial?.id ? 'Simpan' : 'Tambah'}</button>
      </div>
    </>
  )
}

// ── Savings Goal Form ─────────────────────────────────────────────────────────
function GoalForm({ current, onSave, onClose, saving }: { current?: number; onSave: (amount: number, name: string) => void; onClose: () => void; saving: boolean }) {
  const [amount, setAmount] = useState(current?.toString() ?? '')
  const [name, setName] = useState('Target Tabungan')
  const valid = !!amount && parseInt(amount) > 0
  return (
    <>
      <div style={{ marginBottom: 4 }}><label style={labelSt}>Nama target</label><input value={name} onChange={e => setName(e.target.value)} placeholder="contoh: Dana Darurat" style={inp} /></div>
      <div style={{ marginBottom: 16 }}><label style={labelSt}>Jumlah target</label><RupiahInput value={amount} onChange={setAmount} color={T.accent} /></div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={onClose} style={ghostBtn}>Batal</button>
        <button onClick={() => valid && onSave(parseInt(amount), name)} disabled={saving || !valid} style={primaryBtn(saving || !valid)}>{saving ? '...' : 'Set Target'}</button>
      </div>
    </>
  )
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
export default function Dashboard({ user }: { user: User }) {
  const { transactions, loading: txLoading, addTransaction, updateTransaction, deleteTransaction } = useTransactions(user.id)
  const { tasks, loading: taskLoading, addTask, updateTask, updateTaskStatus, deleteTask } = useTasks(user.id)
  const { income, addIncome, deleteIncome } = useIncome(user.id)
  const { goal, setGoalAmount, currentMonth } = useSavingsGoal(user.id)

  const [tab, setTab] = useState<'dashboard' | 'keuangan' | 'tugas'>('dashboard')
  const [saving, setSaving] = useState(false)
  const [txModal, setTxModal] = useState<{ open: boolean; edit?: Transaction }>({ open: false })
  const [scanModal, setScanModal] = useState(false)
  const [incomeModal, setIncomeModal] = useState(false)
  const [taskModal, setTaskModal] = useState<{ open: boolean; edit?: Task }>({ open: false })
  const [goalModal, setGoalModal] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'tx' | 'task' | 'income'; id: string; label: string } | null>(null)
  const [financeView, setFinanceView] = useState<'expense' | 'income'>('expense')

  const today = new Date().toISOString().split('T')[0]
  const monthLabel = new Date().toLocaleString('id-ID', { month: 'long', year: 'numeric' })

  const totalExpense = transactions.reduce((a, b) => a + b.amount, 0)
  const totalIncome = income.reduce((a, b) => a + b.amount, 0)
  const balance = totalIncome - totalExpense
  const savedAmount = balance > 0 ? balance : 0
  const goalPct = goal ? Math.min(100, Math.round((savedAmount / goal.target_amount) * 100)) : 0

  const todaySpent = transactions.filter(t => t.date === today).reduce((a, b) => a + b.amount, 0)
  const pendingTasks = tasks.filter(t => t.status !== 'done')
  const criticalTasks = tasks.filter(t => t.danger_score >= 80 && t.status !== 'done')
  const spendingByCategory = transactions.reduce((acc: Record<string, number>, t) => { acc[t.category] = (acc[t.category] || 0) + t.amount; return acc }, {})

  const handleSaveTx = async (data: { name: string; amount: number; category: string; icon: string }) => {
    setSaving(true)
    try {
      if (txModal.edit) await updateTransaction(txModal.edit.id, data)
      else await addTransaction({ user_id: user.id, date: today, ...data })
      setTxModal({ open: false })
    } finally { setSaving(false) }
  }

  const handleScanAdd = async (items: { name: string; price: number; category: string }[]) => {
    setSaving(true)
    try {
      const iconMap: Record<string, string> = { makan: '🍱', transport: '🛵', kuliah: '📄', jajan: '🧋', lainnya: '💸' }
      for (const item of items) {
        await addTransaction({
          user_id: user.id, date: today,
          name: item.name, amount: item.price, category: item.category,
          icon: iconMap[item.category] || '💸',
        })
      }
      setScanModal(false)
    } finally { setSaving(false) }
  }
  const handleSaveIncome = async (data: { name: string; amount: number; category: string; icon: string }) => {
    setSaving(true)
    try {
      await addIncome({ user_id: user.id, date: today, ...data })
      setIncomeModal(false)
    } finally { setSaving(false) }
  }
  const handleSaveTask = async (data: { title: string; subject: string; deadline: string; difficulty: number; danger_score: number }) => {
    setSaving(true)
    try {
      if (taskModal.edit) await updateTask(taskModal.edit.id, data)
      else await addTask({ user_id: user.id, status: 'todo', ...data })
      setTaskModal({ open: false })
    } finally { setSaving(false) }
  }
  const handleSaveGoal = async (amount: number, name: string) => {
    setSaving(true)
    try { await setGoalAmount(amount, name); setGoalModal(false) }
    finally { setSaving(false) }
  }
  const handleDelete = async () => {
    if (!deleteConfirm) return
    if (deleteConfirm.type === 'tx') await deleteTransaction(deleteConfirm.id)
    else if (deleteConfirm.type === 'income') await deleteIncome(deleteConfirm.id)
    else await deleteTask(deleteConfirm.id)
    setDeleteConfirm(null)
  }

  const card: React.CSSProperties = { background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: 14, marginBottom: 8 }
  const sectionLabel: React.CSSProperties = { fontSize: 11, color: T.muted, textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: 8 }

  return (
    <div style={{ minHeight: '100vh', background: T.bg, maxWidth: 480, margin: '0 auto', fontFamily: "'Inter', system-ui, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        * { box-sizing: border-box; }
        input::placeholder { color: #2a2a2a; }
        input[type=date]::-webkit-calendar-picker-indicator { filter: invert(0.25); }
        ::-webkit-scrollbar { display: none; }
        .row-hover:hover .row-actions { opacity: 1 !important; }
        .fab { transition: transform 0.15s, box-shadow 0.15s; }
        .fab:hover { transform: scale(1.08); }
        .tab-pill { transition: all 0.15s; }
      `}</style>

      {/* ── Header ── */}
      <div style={{ padding: '18px 18px 0', position: 'sticky', top: 0, background: 'rgba(0,0,0,0.96)', zIndex: 50, backdropFilter: 'blur(16px)', borderBottom: `1px solid ${T.border}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 14 }}>
          <div>
            <div style={{ fontSize: 11, color: T.muted, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{user.user_metadata?.name || user.email?.split('@')[0]}</div>
            <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.03em', marginTop: 1 }}>
              <span style={{ color: T.accent }}>Student</span><span style={{ color: T.text }}>Life</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: T.accentBg, border: `1px solid ${T.accentBdr}`, borderRadius: 999, padding: '5px 10px' }}>
              <div style={{ width: 6, height: 6, background: T.accent, borderRadius: '50%' }} />
              <span style={{ color: T.accent, fontSize: 11, fontWeight: 600 }}>Live</span>
            </div>
            <button onClick={() => supabase.auth.signOut()} style={{ background: 'transparent', border: `1px solid ${T.border}`, borderRadius: 8, color: T.muted, padding: '5px 10px', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>Keluar</button>
          </div>
        </div>
        <div style={{ display: 'flex' }}>
          {(['dashboard', 'keuangan', 'tugas'] as const).map(t => (
            <button key={t} className="tab-pill" onClick={() => setTab(t)} style={{
              flex: 1, padding: '10px 4px', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
              background: 'transparent', fontFamily: 'inherit',
              color: tab === t ? T.accent : T.muted,
              borderBottom: `2px solid ${tab === t ? T.accent : 'transparent'}`,
            }}>
              {t === 'dashboard' ? '⊞ Dashboard' : t === 'keuangan' ? '◎ Keuangan' : '◈ Tugas'}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: '16px 18px 100px' }}>

        {/* ══ DASHBOARD ══ */}
        {tab === 'dashboard' && (
          <>
            {/* Balance card */}
            <div style={{ ...card, background: T.accentBg, border: `1px solid ${T.accentBdr}`, textAlign: 'center', padding: '22px 16px', marginBottom: 10 }}>
              <div style={{ fontSize: 11, color: T.accent + '88', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>{monthLabel} · Saldo</div>
              <div style={{ fontSize: 38, fontWeight: 900, color: balance >= 0 ? T.accent : T.danger, letterSpacing: '-0.04em', lineHeight: 1 }}>
                {balance < 0 ? '−' : '+'}Rp {Math.abs(balance).toLocaleString('id-ID')}
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginTop: 12 }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: T.success + '88', marginBottom: 2 }}>Pemasukan</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: T.success }}>+Rp {totalIncome.toLocaleString('id-ID')}</div>
                </div>
                <div style={{ width: 1, background: T.accentBdr }} />
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: T.danger + '88', marginBottom: 2 }}>Pengeluaran</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: T.danger }}>−Rp {totalExpense.toLocaleString('id-ID')}</div>
                </div>
              </div>
            </div>

            {/* Savings goal */}
            <div style={{ ...card, marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <div>
                  <div style={sectionLabel}>🎯 {goal?.name || 'Target Tabungan'}</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: T.text, letterSpacing: '-0.02em' }}>
                    Rp {savedAmount.toLocaleString('id-ID')}
                    {goal && <span style={{ color: T.muted, fontWeight: 400, fontSize: 13 }}> / Rp {goal.target_amount.toLocaleString('id-ID')}</span>}
                  </div>
                </div>
                <button onClick={() => setGoalModal(true)} style={{ background: T.accentBg, border: `1px solid ${T.accentBdr}`, borderRadius: 8, color: T.accent, fontSize: 12, fontWeight: 600, cursor: 'pointer', padding: '6px 12px', fontFamily: 'inherit' }}>
                  {goal ? 'Edit' : 'Set Target'}
                </button>
              </div>
              {goal ? (
                <>
                  <div style={{ height: 6, background: T.border, borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${goalPct}%`, background: goalPct >= 100 ? T.success : T.accent, borderRadius: 99, transition: 'width 0.5s ease' }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                    <span style={{ fontSize: 11, color: T.muted }}>{goalPct}% tercapai</span>
                    {goalPct >= 100 && <span style={{ fontSize: 11, color: T.success, fontWeight: 700 }}>🎉 Target tercapai!</span>}
                    {goalPct < 100 && <span style={{ fontSize: 11, color: T.muted }}>Kurang Rp {(goal.target_amount - savedAmount).toLocaleString('id-ID')}</span>}
                  </div>
                </>
              ) : (
                <div style={{ fontSize: 12, color: T.faint }}>Belum ada target. Tap "Set Target" untuk mulai.</div>
              )}
            </div>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
              <div style={card}>
                <div style={{ fontSize: 10, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Tugas Pending</div>
                <div style={{ fontSize: 32, fontWeight: 900, color: T.text, letterSpacing: '-0.04em' }}>{pendingTasks.length}</div>
                {criticalTasks.length > 0 && <div style={{ fontSize: 11, color: T.danger, marginTop: 4 }}>{criticalTasks.length} critical 🔥</div>}
              </div>
              <div style={card}>
                <div style={{ fontSize: 10, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Hari Ini</div>
                <div style={{ fontSize: 22, fontWeight: 900, color: T.text, letterSpacing: '-0.03em' }}>Rp {todaySpent.toLocaleString('id-ID')}</div>
                <div style={{ fontSize: 11, color: T.muted, marginTop: 4 }}>keluar hari ini</div>
              </div>
            </div>

            {criticalTasks.length > 0 && (
              <div style={{ marginBottom: 10 }}>
                <div style={sectionLabel}>⚠ Perlu Perhatian</div>
                {criticalTasks.map(t => (
                  <div key={t.id} style={{ ...card, border: `1px solid ${T.danger}33`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ color: T.text, fontWeight: 600, fontSize: 14 }}>{t.title}</div>
                      <div style={{ color: T.muted, fontSize: 12, marginTop: 2 }}>{t.subject} · {t.deadline}</div>
                    </div>
                    <DangerBadge score={t.danger_score} status={t.status} />
                  </div>
                ))}
              </div>
            )}

            <div style={sectionLabel}>Transaksi Terbaru</div>
            {transactions.slice(0, 4).map(t => {
              const cat = EXPENSE_CATS[t.category] || EXPENSE_CATS.lainnya
              return (
                <div key={t.id} style={{ ...card, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <div style={{ width: 36, height: 36, background: cat.bg, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, border: `1px solid ${cat.accent}22`, flexShrink: 0 }}>{cat.icon}</div>
                    <div>
                      <div style={{ color: T.text, fontSize: 14, fontWeight: 500 }}>{t.name}</div>
                      <span style={{ color: cat.accent, fontSize: 11, fontWeight: 600 }}>{cat.label}</span>
                    </div>
                  </div>
                  <div style={{ color: T.danger, fontWeight: 700, fontSize: 14 }}>−Rp {t.amount.toLocaleString('id-ID')}</div>
                </div>
              )
            })}
          </>
        )}

        {/* ══ KEUANGAN ══ */}
        {tab === 'keuangan' && (
          <>
            {/* Toggle expense/income */}
            <div style={{ display: 'flex', gap: 4, background: '#0a0a0a', borderRadius: 12, padding: 4, marginBottom: 14 }}>
              {(['expense', 'income'] as const).map(v => (
                <button key={v} onClick={() => setFinanceView(v)} style={{
                  flex: 1, padding: '9px', borderRadius: 8, border: '1px solid',
                  borderColor: financeView === v ? (v === 'expense' ? T.danger : T.success) : T.border,
                  background: financeView === v ? (v === 'expense' ? '#1a0a0a' : '#0a1a0a') : 'transparent',
                  color: financeView === v ? (v === 'expense' ? T.danger : T.success) : T.muted,
                  cursor: 'pointer', fontSize: 13, fontWeight: 700, fontFamily: 'inherit', transition: 'all 0.15s',
                }}>{v === 'expense' ? '↑ Pengeluaran' : '↓ Pemasukan'}</button>
              ))}
            </div>

            {financeView === 'expense' && (
              <>
                {Object.keys(spendingByCategory).length > 0 && (
                  <div style={{ ...card, marginBottom: 10 }}>
                    <div style={sectionLabel}>Breakdown</div>
                    {Object.entries(spendingByCategory).sort((a,b) => b[1]-a[1]).map(([cat, amount]) => {
                      const c = EXPENSE_CATS[cat] || EXPENSE_CATS.lainnya
                      const pct = Math.round((amount / totalExpense) * 100)
                      return (
                        <div key={cat} style={{ marginBottom: 12 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                            <span style={{ color: T.muted, fontSize: 13 }}>{c.label}</span>
                            <span style={{ color: c.accent, fontWeight: 700, fontSize: 13 }}>Rp {amount.toLocaleString('id-ID')} · {pct}%</span>
                          </div>
                          <div style={{ height: 3, background: T.border, borderRadius: 99, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${pct}%`, background: c.accent, borderRadius: 99, transition: 'width 0.4s ease' }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
                <div style={sectionLabel}>Pengeluaran ({transactions.length})</div>
                {txLoading ? <div style={{ color: T.faint, textAlign: 'center', padding: '20px 0', fontSize: 13 }}>Memuat...</div>
                  : transactions.length === 0
                    ? <div style={{ color: T.faint, textAlign: 'center', padding: '40px 0', fontSize: 13 }}>Belum ada pengeluaran.<br />Tap + untuk tambah.</div>
                    : transactions.map(t => {
                        const cat = EXPENSE_CATS[t.category] || EXPENSE_CATS.lainnya
                        return (
                          <div key={t.id} className="row-hover" style={{ ...card, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flex: 1, minWidth: 0 }}>
                              <div style={{ width: 38, height: 38, background: cat.bg, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, border: `1px solid ${cat.accent}22`, flexShrink: 0 }}>{cat.icon}</div>
                              <div style={{ minWidth: 0 }}>
                                <div style={{ color: T.text, fontSize: 14, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.name}</div>
                                <div style={{ display: 'flex', gap: 5, alignItems: 'center', marginTop: 2 }}>
                                  <span style={{ color: cat.accent, fontSize: 11, fontWeight: 600 }}>{cat.label}</span>
                                  <span style={{ color: T.faint, fontSize: 11 }}>· {t.date}</span>
                                </div>
                              </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, marginLeft: 8 }}>
                              <div style={{ color: T.danger, fontWeight: 700, fontSize: 13 }}>−Rp {t.amount.toLocaleString('id-ID')}</div>
                              <div className="row-actions" style={{ display: 'flex', gap: 2, opacity: 0, transition: 'opacity 0.15s' }}>
                                <button onClick={() => setTxModal({ open: true, edit: t })} style={{ background: 'none', border: 'none', color: T.accent, cursor: 'pointer', fontSize: 12, padding: '3px 6px', borderRadius: 6, fontFamily: 'inherit', fontWeight: 600 }}>Edit</button>
                                <button onClick={() => setDeleteConfirm({ type: 'tx', id: t.id, label: t.name })} style={{ background: 'none', border: 'none', color: T.danger, cursor: 'pointer', fontSize: 12, padding: '3px 6px', borderRadius: 6, fontFamily: 'inherit', fontWeight: 600 }}>Hapus</button>
                              </div>
                            </div>
                          </div>
                        )
                      })}
              </>
            )}

            {financeView === 'income' && (
              <>
                <div style={{ ...card, background: '#0a1a0a', border: `1px solid ${T.success}22`, marginBottom: 10, textAlign: 'center', padding: '16px' }}>
                  <div style={{ fontSize: 11, color: T.success + '88', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Total Pemasukan Bulan Ini</div>
                  <div style={{ fontSize: 30, fontWeight: 900, color: T.success, letterSpacing: '-0.03em' }}>+Rp {totalIncome.toLocaleString('id-ID')}</div>
                </div>
                <div style={sectionLabel}>Pemasukan ({income.length})</div>
                {income.length === 0
                  ? <div style={{ color: T.faint, textAlign: 'center', padding: '40px 0', fontSize: 13 }}>Belum ada pemasukan.<br />Tap + untuk tambah.</div>
                  : income.map(item => {
                      const cat = INCOME_CATS[item.category] || INCOME_CATS.lainnya
                      return (
                        <div key={item.id} className="row-hover" style={{ ...card, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flex: 1, minWidth: 0 }}>
                            <div style={{ width: 38, height: 38, background: cat.bg, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, border: `1px solid ${cat.accent}22`, flexShrink: 0 }}>{cat.icon}</div>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ color: T.text, fontSize: 14, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</div>
                              <div style={{ display: 'flex', gap: 5, alignItems: 'center', marginTop: 2 }}>
                                <span style={{ color: cat.accent, fontSize: 11, fontWeight: 600 }}>{cat.label}</span>
                                <span style={{ color: T.faint, fontSize: 11 }}>· {item.date}</span>
                              </div>
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, marginLeft: 8 }}>
                            <div style={{ color: T.success, fontWeight: 700, fontSize: 13 }}>+Rp {item.amount.toLocaleString('id-ID')}</div>
                            <div className="row-actions" style={{ display: 'flex', gap: 2, opacity: 0, transition: 'opacity 0.15s' }}>
                              <button onClick={() => setDeleteConfirm({ type: 'income', id: item.id, label: item.name })} style={{ background: 'none', border: 'none', color: T.danger, cursor: 'pointer', fontSize: 12, padding: '3px 6px', borderRadius: 6, fontFamily: 'inherit', fontWeight: 600 }}>Hapus</button>
                            </div>
                          </div>
                        </div>
                      )
                    })}
              </>
            )}
          </>
        )}

        {/* ══ TUGAS — KANBAN ══ */}
        {tab === 'tugas' && (
          <KanbanBoard
            tasks={tasks}
            loading={taskLoading}
            onStatusChange={(task, status) => updateTaskStatus(task, status)}
            onEdit={(task) => setTaskModal({ open: true, edit: task })}
            onDelete={(task) => setDeleteConfirm({ type: 'task', id: task.id, label: task.title })}
            accent={T.accent}
            warn={T.warn}
            danger={T.danger}
            accentBg={T.accentBg}
            accentBdr={T.accentBdr}
          />
        )}
      </div>

      {/* ── FAB ── */}
      <div style={{ position: 'fixed', bottom: 24, right: 20, zIndex: 9997, display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-end' }}>
        {tab === 'keuangan' && financeView === 'expense' && (
          <button className="fab" onClick={() => setScanModal(true)} style={{ width: 48, height: 48, borderRadius: '50%', background: '#0a0a0a', border: `1px solid ${T.accentBdr}`, cursor: 'pointer', color: T.accent, fontSize: 19, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 16px rgba(0,0,0,0.4)' }}>📸</button>
        )}
        {tab === 'keuangan' && financeView === 'income' && (
          <button className="fab" onClick={() => setIncomeModal(true)} style={{ width: 52, height: 52, borderRadius: '50%', background: '#0a1a0a', border: `1px solid ${T.success}`, cursor: 'pointer', color: T.success, fontSize: 22, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 4px 20px ${T.success}22` }}>+</button>
        )}
        {tab !== 'keuangan' || financeView === 'expense' ? (
          <button className="fab" onClick={() => tab === 'tugas' ? setTaskModal({ open: true }) : setTxModal({ open: true })} style={{ width: 52, height: 52, borderRadius: '50%', background: T.accentBg, border: `1px solid ${T.accent}`, cursor: 'pointer', color: T.accent, fontSize: 22, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 4px 20px ${T.accent}22` }}>+</button>
        ) : null}
      </div>

      {/* ── Modals ── */}
      {txModal.open && <Modal title={txModal.edit ? '✎ Edit Pengeluaran' : '+ Tambah Pengeluaran'} onClose={() => setTxModal({ open: false })}><TxForm initial={txModal.edit} onSave={handleSaveTx} onClose={() => setTxModal({ open: false })} saving={saving} /></Modal>}
      {incomeModal && <Modal title="+ Tambah Pemasukan" onClose={() => setIncomeModal(false)}><IncomeForm onSave={handleSaveIncome} onClose={() => setIncomeModal(false)} saving={saving} /></Modal>}
      {taskModal.open && <Modal title={taskModal.edit ? '✎ Edit Tugas' : '+ Tambah Tugas'} onClose={() => setTaskModal({ open: false })}><TaskForm initial={taskModal.edit} onSave={handleSaveTask} onClose={() => setTaskModal({ open: false })} saving={saving} /></Modal>}
      {goalModal && <Modal title="🎯 Set Target Tabungan" onClose={() => setGoalModal(false)}><GoalForm current={goal?.target_amount} onSave={handleSaveGoal} onClose={() => setGoalModal(false)} saving={saving} /></Modal>}
      {scanModal && <ScanReceiptModal onClose={() => setScanModal(false)} onAdd={handleScanAdd} accent={T.accent} accentBg={T.accentBg} accentBdr={T.accentBdr} />}
      {deleteConfirm && <ConfirmDelete label={deleteConfirm.label} onConfirm={handleDelete} onCancel={() => setDeleteConfirm(null)} />}
    </div>
  )
}
