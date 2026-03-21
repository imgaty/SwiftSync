"use client"

import { useEffect, useRef } from "react"
import { Toaster } from "@/components/ui/sonner"

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stateRef = useRef({ mx: -1, my: -1, active: false, fade: 0, pmx: 0.5, pmy: 0.5 })
  const ripplesRef = useRef<{ x: number; y: number; born: number }[]>([])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // ── Respect prefers-reduced-motion ──
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    if (mq.matches) return // skip animation entirely

    // ── Config ──
    const GAP = 24
    const DOT_R_BASE = 1.0    // base dot radius
    const DOT_R_PEAK = 1.3    // dot radius at wave peak
    const ALPHA_BASE = 0.05   // base alpha
    const ALPHA_PEAK = 0.08   // alpha at wave peak
    const WAVE_AMP = 4        // positional displacement px
    const WAVE_WIDTH = 280    // width of the single wave band in px (wider = smoother)
    const CYCLE_MS = 7000     // ms for one full sweep across the screen
    const ZOOM_R = 100        // hover lens radius
    const ZOOM_SCALE = 1.8    // max dot scale at center of lens
    const PARALLAX_PX = 14    // max parallax shift in px

    let rafId = 0

    // ── Resize ──
    const resize = () => {
      const dpr = window.devicePixelRatio || 1
      canvas.width = window.innerWidth * dpr
      canvas.height = window.innerHeight * dpr
      canvas.style.width = `${window.innerWidth}px`
      canvas.style.height = `${window.innerHeight}px`
    }
    resize()
    window.addEventListener("resize", resize)

    // ── Cache dark mode via MutationObserver ──
    let dark = document.documentElement.classList.contains("dark")
    const mo = new MutationObserver(() => {
      dark = document.documentElement.classList.contains("dark")
    })
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] })

    // Perpendicular to travel direction (bottom-right → top-left)
    const PERP_X = -0.7071 // -1/√2
    const PERP_Y =  0.7071 //  1/√2

    // ── Draw loop ──
    const draw = (time: number) => {
      const dpr = window.devicePixelRatio || 1
      const w = window.innerWidth
      const h = window.innerHeight
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, w, h)

      const st = stateRef.current

      // Smooth fade for zoom lens
      if (st.active) st.fade = Math.min(1, st.fade + 0.06)
      else st.fade = Math.max(0, st.fade - 0.04)

      const cols = Math.ceil(w / GAP) + 6
      const rows = Math.ceil(h / GAP) + 6
      const darkMul = dark ? 0.8 : 1
      const { mx, my, fade } = st

      // ── Parallax: smooth mouse-based offset ──
      // pmx/pmy track normalised mouse position (0…1), lerped for smoothness
      const targetPx = mx >= 0 ? mx / w : 0.5
      const targetPy = my >= 0 ? my / h : 0.5
      st.pmx += (targetPx - st.pmx) * 0.04
      st.pmy += (targetPy - st.pmy) * 0.04
      const parX = (st.pmx - 0.5) * -PARALLAX_PX  // shift opposite to cursor
      const parY = (st.pmy - 0.5) * -PARALLAX_PX

      // The full diagonal span of the screen
      const maxDiag = (w + h) * 0.7071
      // Current position of the wave center along the diagonal,
      // traveling from bottom-right (maxDiag) to top-left (0), looping.
      // Add WAVE_WIDTH padding so the wave fully exits before re-entering.
      const totalTravel = maxDiag + WAVE_WIDTH * 2
      const t01 = (time % CYCLE_MS) / CYCLE_MS  // 0→1 repeating
      const waveCenter = maxDiag + WAVE_WIDTH - t01 * totalTravel

      // Gaussian-like shape: exp(-(d/sigma)²)
      const sigma = WAVE_WIDTH * 0.55  // wider falloff → smoother band

      // ── Click ripples ──
      const RIPPLE_DURATION = 1800   // ms to fully fade out
      const RIPPLE_MAX_R = 350       // max radius px
      const RIPPLE_RING_W = 90       // width of the visible ring band
      const ripples = ripplesRef.current
      // Prune dead ripples
      for (let i = ripples.length - 1; i >= 0; i--) {
        if (time - ripples[i].born > RIPPLE_DURATION) ripples.splice(i, 1)
      }

      // Zoomed dots need individual draws (variable radius / alpha)
      const zoomBuf: { x: number; y: number; r: number; a: number }[] = []

      for (let row = -3; row < rows; row++) {
        for (let col = -3; col < cols; col++) {
          const bx = col * GAP + parX
          const by = row * GAP + parY

          // ── Single wave pulse ──
          const diag = (col * GAP + row * GAP) * 0.7071
          const dist = diag - waveCenter
          const pulse = Math.exp(-(dist * dist) / (sigma * sigma)) // 0…1

          // Positional displacement (perpendicular, at wave peak)
          const dx = WAVE_AMP * PERP_X * pulse
          const dy = WAVE_AMP * PERP_Y * pulse

          // Size & opacity modulated by pulse
          let dotR = DOT_R_BASE + (DOT_R_PEAK - DOT_R_BASE) * pulse
          let dotAlpha = (ALPHA_BASE + (ALPHA_PEAK - ALPHA_BASE) * pulse) * darkMul

          let x = bx + dx
          let y = by + dy

          // ── Apply click ripples to this dot ──
          for (const rp of ripples) {
            const age = (time - rp.born) / RIPPLE_DURATION // 0→1
            const easeAge = 1 - (1 - age) * (1 - age) // ease-out quadratic for expansion
            const rpRadius = Math.max(0.01, easeAge * RIPPLE_MAX_R)
            const rdx = x - rp.x
            const rdy = y - rp.y
            const rdist = Math.sqrt(rdx * rdx + rdy * rdy)
            const ringDist = Math.abs(rdist - rpRadius)
            if (ringDist < RIPPLE_RING_W) {
              const ringT = 1 - ringDist / RIPPLE_RING_W // 1 at ring center, 0 at edge
              const fadeOut = (1 - age) * (1 - age) * (1 - age) // cubic fade — very gentle
              const intensity = ringT * ringT * fadeOut
              dotR += 0.5 * intensity
              dotAlpha += 0.04 * intensity * darkMul
              // Gentle push outward from ripple center
              if (rdist > 0.1) {
                const push = 1.5 * intensity
                x += (rdx / rdist) * push
                y += (rdy / rdist) * push
              }
            }
          }
          let zoomed = false
          let finalR = dotR
          let finalA = dotAlpha

          // ── Zoom lens ──
          if (fade > 0.01 && mx >= 0) {
            const dx2 = x - mx
            const dy2 = y - my
            const dist = Math.sqrt(dx2 * dx2 + dy2 * dy2)

            if (dist < ZOOM_R) {
              const t = 1 - dist / ZOOM_R
              const ease = t * t * (3 - 2 * t) // smoothstep
              const scale = 1 + (ZOOM_SCALE - 1) * ease * fade
              finalR = dotR * scale
              finalA = dotAlpha + dotAlpha * 1.5 * ease * fade

              // Push outward for magnification feel
              if (dist > 0.1) {
                const push = ease * fade * 4
                x += (dx2 / dist) * push
                y += (dy2 / dist) * push
              }

              zoomBuf.push({ x, y, r: finalR, a: finalA })
              zoomed = true
            }
          }

          if (!zoomed) {
            // Each dot gets its own colour since alpha varies with wave
            ctx.fillStyle = dark
              ? `rgba(255,255,255,${finalA})`
              : `rgba(0,0,0,${finalA})`
            ctx.beginPath()
            ctx.arc(x, y, finalR, 0, Math.PI * 2)
            ctx.fill()
          }
        }
      }

      // Draw zoomed dots
      for (const d of zoomBuf) {
        ctx.fillStyle = dark
          ? `rgba(255,255,255,${d.a})`
          : `rgba(0,0,0,${d.a})`
        ctx.beginPath()
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2)
        ctx.fill()
      }

      // ── Draw ripple rings ──
      for (const rp of ripples) {
        const age = (time - rp.born) / RIPPLE_DURATION
        const easeAge = 1 - (1 - age) * (1 - age)
        const rpRadius = Math.max(0.01, easeAge * RIPPLE_MAX_R)
        const fadeOut = (1 - age) * (1 - age) * (1 - age) // cubic fade
        if (fadeOut > 0.001) {
          ctx.beginPath()
          ctx.arc(rp.x, rp.y, rpRadius, 0, Math.PI * 2)
          ctx.strokeStyle = dark
            ? `rgba(255,255,255,${0.035 * fadeOut})`
            : `rgba(0,0,0,${0.025 * fadeOut})`
          ctx.lineWidth = 1
          ctx.stroke()
        }
      }

      rafId = requestAnimationFrame(draw)
    }
    rafId = requestAnimationFrame(draw)

    // ── Click ripple handler ──
    const onClick = (e: MouseEvent) => {
      const rp = ripplesRef.current
      // Cap at 8 simultaneous ripples to prevent overload
      if (rp.length >= 8) rp.shift()
      rp.push({ x: e.clientX, y: e.clientY, born: performance.now() })
    }
    window.addEventListener("click", onClick)

    // ── Mouse tracking ──
    const onMove = (e: MouseEvent) => {
      const el = e.target as HTMLElement
      // Hide zoom when cursor is over any interactive UI element
      const overUI = el.closest(
        "form, button, input, a, select, textarea"
      )
      stateRef.current.mx = e.clientX
      stateRef.current.my = e.clientY
      stateRef.current.active = !overUI
    }
    const onLeave = () => {
      stateRef.current.active = false
    }

    window.addEventListener("mousemove", onMove)
    document.addEventListener("mouseleave", onLeave)

    return () => {
      cancelAnimationFrame(rafId)
      mo.disconnect()
      window.removeEventListener("resize", resize)
      window.removeEventListener("mousemove", onMove)
      document.removeEventListener("mouseleave", onLeave)
      window.removeEventListener("click", onClick)
    }
  }, [])

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-white p-8 dark:bg-black transition-colors duration-300">
      <canvas
        ref={canvasRef}
        className="fixed inset-0 z-0 pointer-events-none"
      />
      <Toaster richColors closeButton position="top-center" />
      {children}
    </div>
  )
}
