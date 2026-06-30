'use client'
import { useState } from 'react'
import type { Task } from '@/lib/hooks/useTasks'

type Status = 'todo' | 'progress' | 'done'

type Props = {
  tasks: Task[]
  loading: boolean
  onStatusChange: (task: Task, status: Status) => void
  onEdit: (task: Task) => void
  onDelete: (task: Task) => void
  accent: string; warn: string; danger: string; accentBg: string; accentBdr: string
}

const COL: Record<Status, { label: string; color: string; bg: string; border: string; icon: string }> = {
  todo:     { label: 'Todo',    color: '#aaa',    bg: '#0d0d0d', border: '#252525', icon: '○' },
  progress: { label: 'Jalan',   color: '#fbbf24', bg: '#0f0b00', border: '#fbbf2444', icon: '◑' },
  done:     { label: 'Selesai', color: '#a78bfa', bg: '#0a0814', border: '#a78bfa44', icon: '●' },
}

// Ripple button
function Btn({ children, onClick, color, bg = 'transparent', border }: { children: React.ReactNode; onClick: () => void; color: string; bg?: string; border?: string }) {
  const [ripples, setRipples] = useState<{ x: number; y: number; id: number }[]>([])
  const fire = (e: React.MouseEvent<HTMLButtonElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    const id = Date.now()
    setRipples(p => [...p, { x: e.clientX - r.left, y: e.clientY - r.top, id }])
    setTimeout(() => setRipples(p => p.filter(i => i.id !== id)), 600)
    onClick()
  }
  return (
    <button type="button" onClick={fire} style={{
      position: 'relative', overflow: 'hidden', background: bg,
      border: `1px solid ${border || color + '44'}`, borderRadius: 7,
      color, cursor: 'pointer', fontSize: 11, padding: '4px 9px',
      fontFamily: 'inherit', fontWeight: 700, transition: 'background 0.15s, transform 0.1s',
    }}
      onMouseEnter={e => { e.currentTarget.style.background = color + '15' }}
      onMouseLeave={e => { e.currentTarget.style.background = bg }}
      onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.94)' }}
      onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
    >
      {ripples.map(r => (
        <span key={r.id} style={{
          position: 'absolute', width: 80, height: 80,
          left: r.x - 40, top: r.y - 40,
          borderRadius: '50%', background: color + '30',
          transform: 'scale(0)', pointerEvents: 'none',
          animation: 'ripple 0.6s ease forwards',
        }} />
      ))}
      {children}
    </button>
  )
}

export default function KanbanBoard({ tasks, loading, onStatusChange, onEdit, onDelete, accent, warn, danger, accentBg, accentBdr }: Props) {
  const [selected, setSelected] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState<Status | null>(null)
  const [dragging, setDragging] = useState<string | null>(null)

  if (loading) return (
    <div style={{ display: 'flex', gap: 10 }}>
      {[0,1,2].map(i => (
        <div key={i} style={{ flex: '0 0 185px', height: 200, background: '#0a0a0a', borderRadius: 14, border: '1px solid #1a1a1a', overflow: 'hidden' }}>
          <div style={{ height: '100%', background: 'linear-gradient(90deg,#0f0f0f 25%,#1a1a1a 50%,#0f0f0f 75%)', backgroundSize: '400px 100%', animation: 'shimmer 1.6s infinite linear' }} />
        </div>
      ))}
    </div>
  )

  if (tasks.length === 0) return (
    <div style={{ color: '#555', fontSize: 13, padding: '60px 0', textAlign: 'center' }}>
      Belum ada tugas.<br /><span style={{ color: '#333', fontSize: 12 }}>Tap + untuk tambah.</span>
    </div>
  )

  const selectedTask = tasks.find(t => t.id === selected)
  const pendingCount = tasks.filter(t => t.status !== 'done').length

  return (
    <>
      <style>{`
        @keyframes ripple { to { transform: scale(4); opacity: 0; } }
        @keyframes shimmer { 0%{background-position:-400px 0} 100%{background-position:400px 0} }
        @keyframes cardIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes popIn { from{opacity:0;transform:scale(0.92)} to{opacity:1;transform:scale(1)} }
        .kcard { transition: box-shadow 0.15s, border-color 0.15s; }
        .kcard:hover { box-shadow: 0 4px 20px rgba(0,0,0,0.5) !important; }
        .kcard.selected { animation: popIn 0.2s ease; }
      `}</style>

      <div style={{ fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
        {tasks.length} tugas · {pendingCount} pending ·{' '}
        <span style={{ color: accent }}>klik kartu → pilih kolom tujuan</span>
      </div>

      {/* Move hint bar — muncul kalau ada yang dipilih */}
      {selected && selectedTask && (
        <div style={{
          background: accentBg, border: `1px solid ${accent}55`,
          borderRadius: 10, padding: '10px 14px', marginBottom: 12,
          display: 'flex', alignItems: 'center', gap: 10,
          animation: 'cardIn 0.2s ease',
        }}>
          <span style={{ color: accent, fontSize: 13 }}>◈</span>
          <span style={{ color: '#ccc', fontSize: 13, flex: 1 }}>
            <span style={{ color: '#fff', fontWeight: 600 }}>{selectedTask.title}</span>
            {' '}— pindah ke:
          </span>
          <div style={{ display: 'flex', gap: 6 }}>
            {(Object.keys(COL) as Status[]).filter(s => s !== selectedTask.status).map(s => (
              <Btn key={s} onClick={() => { onStatusChange(selectedTask, s); setSelected(null) }}
                color={COL[s].color} border={COL[s].border}>
                {COL[s].icon} {COL[s].label}
              </Btn>
            ))}
            <Btn onClick={() => setSelected(null)} color="#555" border="#2a2a2a">✕</Btn>
          </div>
        </div>
      )}

      {/* Kanban columns */}
      <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 12, marginLeft: -18, marginRight: -18, paddingLeft: 18, paddingRight: 18 }}>
        {(Object.keys(COL) as Status[]).map(col => {
          const cfg = COL[col]
          const colTasks = [...tasks].filter(t => t.status === col).sort((a, b) => b.danger_score - a.danger_score)
          const isOver = dragOver === col

          return (
            <div key={col}
              onDragOver={e => { e.preventDefault(); setDragOver(col) }}
              onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOver(null) }}
              onDrop={e => {
                e.preventDefault(); setDragOver(null)
                const id = e.dataTransfer.getData('taskId')
                const t = tasks.find(x => x.id === id)
                if (t && t.status !== col) onStatusChange(t, col)
                setDragging(null)
              }}
              style={{
                flex: '0 0 185px', minHeight: 300,
                background: isOver ? cfg.bg + 'ee' : cfg.bg,
                border: `1px solid ${isOver ? cfg.color + '88' : cfg.border}`,
                borderRadius: 14, padding: 10,
                transition: 'border-color 0.15s, background 0.15s',
                boxShadow: isOver ? `0 0 0 1px ${cfg.color}44, inset 0 0 20px ${cfg.color}08` : 'none',
              }}
            >
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                <span style={{ color: cfg.color, fontSize: 12 }}>{cfg.icon}</span>
                <span style={{ color: cfg.color, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{cfg.label}</span>
                <span style={{ marginLeft: 'auto', background: '#111', color: '#555', fontSize: 10, fontWeight: 700, borderRadius: 999, padding: '2px 7px', border: '1px solid #1a1a1a' }}>{colTasks.length}</span>
              </div>

              {/* Drop hint */}
              {colTasks.length === 0 && (
                <div style={{
                  border: `2px dashed ${isOver ? cfg.color + '77' : '#1a1a1a'}`,
                  borderRadius: 10, padding: '22px 8px', textAlign: 'center',
                  color: isOver ? cfg.color : '#2a2a2a', fontSize: 11, transition: 'all 0.15s',
                }}>
                  {isOver ? `↓ Lepas di sini` : 'Kosong'}
                </div>
              )}

              {/* Cards */}
              {colTasks.map(task => {
                const isSelected = selected === task.id
                const isDraggingThis = dragging === task.id
                return (
                  <div key={task.id}
                    className={`kcard${isSelected ? ' selected' : ''}`}
                    draggable
                    onDragStart={e => {
                      setDragging(task.id); setSelected(null)
                      e.dataTransfer.setData('taskId', task.id)
                      e.dataTransfer.effectAllowed = 'move'
                    }}
                    onDragEnd={() => { setDragging(null); setDragOver(null) }}
                    onClick={() => setSelected(isSelected ? null : task.id)}
                    style={{
                      background: isSelected ? accentBg : '#0a0a0a',
                      border: `1px solid ${isSelected ? accent + '88' : task.danger_score >= 80 && col !== 'done' ? danger + '44' : '#1a1a1a'}`,
                      borderRadius: 10, padding: 10, marginBottom: 7,
                      cursor: 'pointer', userSelect: 'none',
                      opacity: isDraggingThis ? 0.3 : 1,
                      transition: 'background 0.15s, border-color 0.15s, opacity 0.15s, transform 0.15s',
                      transform: isSelected ? 'scale(1.01)' : 'scale(1)',
                      animation: 'cardIn 0.25s ease',
                      boxShadow: isSelected ? `0 0 0 1px ${accent}44, 0 4px 20px ${accentBg}` : 'none',
                    }}
                  >
                    <div style={{ color: col === 'done' ? '#555' : '#f0f0f0', fontWeight: 600, fontSize: 13, marginBottom: 3, textDecoration: col === 'done' ? 'line-through' : 'none', lineHeight: 1.4 }}>
                      {task.title}
                    </div>
                    <div style={{ color: '#666', fontSize: 11, marginBottom: 7 }}>{task.subject}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <span style={{ color: '#444', fontSize: 10 }}>📅 {task.deadline}</span>
                      {/* Danger badge */}
                      {col === 'done'
                        ? <span style={{ background: accentBg, color: accent, border: `1px solid ${accentBdr}`, padding: '2px 7px', borderRadius: 999, fontSize: 10, fontWeight: 700 }}>✓</span>
                        : task.danger_score >= 80
                          ? <span style={{ background: '#1a0a0a', color: danger, border: `1px solid ${danger}33`, padding: '2px 7px', borderRadius: 999, fontSize: 10, fontWeight: 700 }}>🔥{task.danger_score}</span>
                          : task.danger_score >= 50
                            ? <span style={{ background: '#1a130a', color: warn, border: `1px solid ${warn}33`, padding: '2px 7px', borderRadius: 999, fontSize: 10, fontWeight: 700 }}>⚠{task.danger_score}</span>
                            : <span style={{ background: '#0a1a0a', color: '#4ade80', border: '1px solid #4ade8033', padding: '2px 7px', borderRadius: 999, fontSize: 10, fontWeight: 700 }}>✓{task.danger_score}</span>
                      }
                    </div>
                    <div style={{ display: 'flex', gap: 4, paddingTop: 7, borderTop: '1px solid #111' }}>
                      <Btn onClick={(e: any) => { e?.stopPropagation?.(); onEdit(task) }} color={accent}>✎ Edit</Btn>
                      <Btn onClick={(e: any) => { e?.stopPropagation?.(); onDelete(task) }} color={danger}>✕ Hapus</Btn>
                    </div>
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
    </>
  )
}
