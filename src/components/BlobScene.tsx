'use client'
import { useEffect, useRef } from 'react'

export default function BlobScene() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    let animId: number
    let mouse = { x: 0, y: 0 }
    let target = { x: 0, y: 0 }
    let time = 0

    const W = canvas.offsetWidth
    const H = canvas.offsetHeight
    canvas.width = W
    canvas.height = H

    const ctx = canvas.getContext('2d')!

    // ── Mouse tracking ──
    const onMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      mouse.x = ((e.clientX - rect.left) / W) * 2 - 1
      mouse.y = -((e.clientY - rect.top) / H) * 2 + 1
    }
    window.addEventListener('mousemove', onMove)

    // ── Perlin-like noise using sin/cos ──
    function noise(x: number, y: number, t: number): number {
      return (
        Math.sin(x * 2.3 + t * 0.7) * 0.3 +
        Math.cos(y * 1.8 - t * 0.5) * 0.3 +
        Math.sin((x + y) * 1.5 + t * 0.9) * 0.2 +
        Math.cos((x - y) * 2.1 - t * 0.4) * 0.2
      )
    }

    // ── Draw blob ──
    function drawBlob(
      cx: number, cy: number,
      radius: number,
      color1: string, color2: string,
      timeOffset: number,
      noiseScale: number,
      points: number
    ) {
      ctx.beginPath()
      for (let i = 0; i <= points; i++) {
        const angle = (i / points) * Math.PI * 2
        const nx = Math.cos(angle) * noiseScale
        const ny = Math.sin(angle) * noiseScale
        const n = noise(nx, ny, time + timeOffset)
        const r = radius * (1 + n * 0.35)
        const x = cx + Math.cos(angle) * r
        const y = cy + Math.sin(angle) * r
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.closePath()

      // Gradient fill
      const grad = ctx.createRadialGradient(cx - radius * 0.2, cy - radius * 0.2, 0, cx, cy, radius * 1.4)
      grad.addColorStop(0, color1)
      grad.addColorStop(1, color2)
      ctx.fillStyle = grad
      ctx.fill()
    }

    // ── Render loop ──
    function render() {
      ctx.clearRect(0, 0, W, H)

      // Smooth mouse follow
      target.x += (mouse.x - target.x) * 0.04
      target.y += (mouse.y - target.y) * 0.04

      const cx = W / 2 + target.x * W * 0.12
      const cy = H / 2 - target.y * H * 0.12

      // Outer glow blob
      ctx.save()
      ctx.globalAlpha = 0.18
      drawBlob(cx, cy, Math.min(W, H) * 0.42, '#a78bfa', '#00000000', 0, 1.2, 80)
      ctx.restore()

      // Mid blob
      ctx.save()
      ctx.globalAlpha = 0.28
      drawBlob(cx, cy, Math.min(W, H) * 0.30, '#7c3aed', '#a78bfa', 0.5, 1.0, 80)
      ctx.restore()

      // Inner blob
      ctx.save()
      ctx.globalAlpha = 0.55
      drawBlob(cx, cy, Math.min(W, H) * 0.18, '#8b5cf6', '#c4b5fd', 1.0, 0.7, 80)
      ctx.restore()

      // Core bright spot
      ctx.save()
      ctx.globalAlpha = 0.7
      const coreGrad = ctx.createRadialGradient(cx - 20, cy - 20, 0, cx, cy, Math.min(W, H) * 0.09)
      coreGrad.addColorStop(0, '#e9d5ff')
      coreGrad.addColorStop(0.4, '#a78bfa')
      coreGrad.addColorStop(1, '#7c3aed00')
      ctx.fillStyle = coreGrad
      ctx.beginPath()
      ctx.arc(cx, cy, Math.min(W, H) * 0.12, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()

      // Secondary smaller blob (orbiting)
      const orbitR = Math.min(W, H) * 0.28
      const orbitX = cx + Math.cos(time * 0.4) * orbitR * (0.6 + target.x * 0.3)
      const orbitY = cy + Math.sin(time * 0.3) * orbitR * (0.5 + target.y * 0.2)

      ctx.save()
      ctx.globalAlpha = 0.15
      drawBlob(orbitX, orbitY, Math.min(W, H) * 0.13, '#60a5fa', '#00000000', 2.0, 0.9, 60)
      ctx.restore()

      ctx.save()
      ctx.globalAlpha = 0.35
      drawBlob(orbitX, orbitY, Math.min(W, H) * 0.08, '#3b82f6', '#60a5fa', 2.5, 0.6, 60)
      ctx.restore()

      time += 0.008
      animId = requestAnimationFrame(render)
    }

    render()

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('mousemove', onMove)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: '100%',
        height: '100%',
        display: 'block',
        background: 'transparent',
      }}
    />
  )
}
