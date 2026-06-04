//
//  canvas-background.tsx
//  Argent
//
//  Created by Hilario Ferreira on 21 March 2026 at 17:05.
//  Description: Implements the Canvas background React component for Argent, encapsulating reusable
//  interface structure, state handling, and presentation logic for feature screens.
//  Last changed by hilario on 30 May 2026 at 19:35.
//
"use client"

import { useEffect, useRef } from "react"

type CanvasBackgroundTone = "default" | "auth"

export function CanvasBackground({
  inset,
  tone = "default",
}: {
  inset?: boolean
  tone?: CanvasBackgroundTone
} = {}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stateRef = useRef({ mx: -1, my: -1, active: false, fade: 0, pmx: 0.5, pmy: 0.5 })
  const ripplesRef = useRef<{ x: number; y: number; born: number }[]>([])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const context = canvas.getContext("2d")
    if (!context) return
    const ctx: CanvasRenderingContext2D = context
    const container = inset ? canvas.parentElement : null

    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    if (mq.matches) return

    const authTone = tone === "auth"
    const DPR_CAP = 2
    const BASE_GAP = 24
    const DOT_R_BASE = 0.85
    const DOT_R_PEAK = authTone ? 1.05 : 1.15
    const ALPHA_BASE = authTone ? 0.024 : 0.05
    const ALPHA_PEAK = authTone ? 0.04 : 0.08
    const WAVE_AMP = 4
    const WAVE_WIDTH = 170
    const CYCLE_MS = 7000
    const ZOOM_R = 56
    const ZOOM_SCALE = 1.8
    const PARALLAX_PX = 14

    let rafId = 0
    let boundsRafId = 0
    let loadingObserver: MutationObserver | null = null
    let deferredByLoader = Boolean(document.querySelector('[aria-label="Loading"]'))

    const getDpr = () => Math.min(DPR_CAP, window.devicePixelRatio || 1)
    const getGap = () => BASE_GAP

    const getSize = () => {
      if (inset && container) {
        return { w: container.clientWidth, h: container.clientHeight }
      }
      return { w: window.innerWidth, h: window.innerHeight }
    }

    const getOffset = () => {
      if (inset && container) {
        const rect = container.getBoundingClientRect()
        return { ox: rect.left, oy: rect.top }
      }
      return { ox: 0, oy: 0 }
    }

    let dark = document.documentElement.classList.contains("dark")
    const mo = new MutationObserver(() => {
      dark = document.documentElement.classList.contains("dark")
      scheduleDraw()
    })
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] })

    const PERP_X = -0.7071
    const PERP_Y = 0.7071

    function scheduleDraw() {
      if (deferredByLoader) return
      if (rafId || document.visibilityState === "hidden") return
      rafId = requestAnimationFrame(draw)
    }

    function draw(time: number) {
      rafId = 0

      const dpr = getDpr()
      const { w, h } = getSize()
      if (w <= 0 || h <= 0) return
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, w, h)

      if (authTone && !dark) {
        ctx.fillStyle = "#ffffff"
        ctx.fillRect(0, 0, w, h)
      }

      const st = stateRef.current

      if (st.active) st.fade = Math.min(1, st.fade + 0.06)
      else st.fade = Math.max(0, st.fade - 0.04)

      const gap = getGap()
      const cols = Math.ceil(w / gap) + 6
      const rows = Math.ceil(h / gap) + 6
      const darkMul = dark ? 0.8 : 1
      const { mx, my, fade } = st

      const targetPx = mx >= 0 ? mx / w : 0.5
      const targetPy = my >= 0 ? my / h : 0.5
      st.pmx += (targetPx - st.pmx) * 0.04
      st.pmy += (targetPy - st.pmy) * 0.04
      const parX = (st.pmx - 0.5) * -PARALLAX_PX
      const parY = (st.pmy - 0.5) * -PARALLAX_PX

      const maxDiag = (w + h) * 0.7071
      const totalTravel = maxDiag + WAVE_WIDTH * 2
      const t01 = (time % CYCLE_MS) / CYCLE_MS
      const waveCenter = maxDiag + WAVE_WIDTH - t01 * totalTravel
      const sigma = WAVE_WIDTH * 0.55

      const RIPPLE_DURATION = 1800
      const RIPPLE_MAX_R = 220
      const RIPPLE_RING_W = 90
      const ripples = ripplesRef.current

      for (let i = ripples.length - 1; i >= 0; i--) {
        if (time - ripples[i].born > RIPPLE_DURATION) ripples.splice(i, 1)
      }

      const zoomBuf: { x: number; y: number; r: number; a: number }[] = []
      ctx.fillStyle = dark ? "rgb(255,255,255)" : "rgb(0,0,0)"

      for (let row = -3; row < rows; row++) {
        for (let col = -3; col < cols; col++) {
          const bx = col * gap + parX
          const by = row * gap + parY

          const diag = (col * gap + row * gap) * 0.7071
          const dist = diag - waveCenter
          const pulse = Math.exp(-(dist * dist) / (sigma * sigma))

          const dx = WAVE_AMP * PERP_X * pulse
          const dy = WAVE_AMP * PERP_Y * pulse

          let dotR = DOT_R_BASE + (DOT_R_PEAK - DOT_R_BASE) * pulse
          let dotAlpha = (ALPHA_BASE + (ALPHA_PEAK - ALPHA_BASE) * pulse) * darkMul

          let x = bx + dx
          let y = by + dy

          for (const rp of ripples) {
            const age = (time - rp.born) / RIPPLE_DURATION
            const easeAge = 1 - (1 - age) * (1 - age)
            const rpRadius = Math.max(0.01, easeAge * RIPPLE_MAX_R)
            const rdx = x - rp.x
            const rdy = y - rp.y
            const rdist = Math.sqrt(rdx * rdx + rdy * rdy)
            const ringDist = Math.abs(rdist - rpRadius)
            if (ringDist < RIPPLE_RING_W) {
              const ringT = 1 - ringDist / RIPPLE_RING_W
              const fadeOut = (1 - age) * (1 - age) * (1 - age)
              const intensity = ringT * ringT * fadeOut
              dotR += 0.5 * intensity
              dotAlpha += 0.04 * intensity * darkMul

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

          if (fade > 0.01 && mx >= 0) {
            const dx2 = x - mx
            const dy2 = y - my
            const dist = Math.sqrt(dx2 * dx2 + dy2 * dy2)

            if (dist < ZOOM_R) {
              const t = 1 - dist / ZOOM_R
              const ease = t * t * (3 - 2 * t)
              const scale = 1 + (ZOOM_SCALE - 1) * ease * fade
              finalR = dotR * scale
              finalA = dotAlpha + dotAlpha * 1.5 * ease * fade

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
            ctx.globalAlpha = Math.min(1, finalA)
            ctx.beginPath()
            ctx.arc(x, y, finalR, 0, Math.PI * 2)
            ctx.fill()
          }
        }
      }

      for (const d of zoomBuf) {
        ctx.globalAlpha = Math.min(1, d.a)
        ctx.beginPath()
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2)
        ctx.fill()
      }

      ctx.globalAlpha = 1
      ctx.strokeStyle = dark ? "rgb(255,255,255)" : "rgb(0,0,0)"
      for (const rp of ripples) {
        const age = (time - rp.born) / RIPPLE_DURATION
        const easeAge = 1 - (1 - age) * (1 - age)
        const rpRadius = Math.max(0.01, easeAge * RIPPLE_MAX_R)
        const fadeOut = (1 - age) * (1 - age) * (1 - age)
        if (fadeOut > 0.001) {
          ctx.beginPath()
          ctx.arc(rp.x, rp.y, rpRadius, 0, Math.PI * 2)
          ctx.globalAlpha = (dark ? 0.035 : authTone ? 0.014 : 0.025) * fadeOut
          ctx.lineWidth = 1
          ctx.stroke()
        }
      }
      ctx.globalAlpha = 1

      scheduleDraw()
    }

    const syncCanvasBounds = () => {
      const dpr = getDpr()
      const { w, h } = getSize()

      if (inset && container) {
        const rect = container.getBoundingClientRect()
        canvas.style.left = `${rect.left}px`
        canvas.style.top = `${rect.top}px`
      } else {
        canvas.style.left = "0px"
        canvas.style.top = "0px"
      }

      canvas.width = Math.max(1, Math.ceil(w * dpr))
      canvas.height = Math.max(1, Math.ceil(h * dpr))
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
      scheduleDraw()
    }

    const scheduleCanvasBoundsSync = () => {
      if (boundsRafId) return
      boundsRafId = requestAnimationFrame(() => {
        boundsRafId = 0
        syncCanvasBounds()
      })
    }

    if (deferredByLoader) {
      loadingObserver = new MutationObserver(() => {
        if (document.querySelector('[aria-label="Loading"]')) return
        deferredByLoader = false
        loadingObserver?.disconnect()
        loadingObserver = null
        scheduleCanvasBoundsSync()
      })
      loadingObserver.observe(document.body, { childList: true, subtree: true })
    }

    syncCanvasBounds()

    let ro: ResizeObserver | null = null
    if (inset && container) {
      ro = new ResizeObserver(scheduleCanvasBoundsSync)
      ro.observe(container)
      window.addEventListener("resize", scheduleCanvasBoundsSync)
      window.addEventListener("scroll", scheduleCanvasBoundsSync, { passive: true })
    } else {
      window.addEventListener("resize", scheduleCanvasBoundsSync)
    }

    const onClick = (e: MouseEvent) => {
      const { ox, oy } = getOffset()
      const rp = ripplesRef.current
      if (rp.length >= 8) rp.shift()
      rp.push({ x: e.clientX - ox, y: e.clientY - oy, born: performance.now() })
      scheduleDraw()
    }
    window.addEventListener("click", onClick)

    const onMove = (e: MouseEvent) => {
      const el = e.target as HTMLElement
      const overUI = el.closest("form, button, input, a, select, textarea")
      const { ox, oy } = getOffset()
      stateRef.current.mx = e.clientX - ox
      stateRef.current.my = e.clientY - oy
      stateRef.current.active = !overUI
      scheduleDraw()
    }
    const onLeave = () => {
      stateRef.current.active = false
      scheduleDraw()
    }
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        cancelAnimationFrame(rafId)
        rafId = 0
        cancelAnimationFrame(boundsRafId)
        boundsRafId = 0
      } else {
        scheduleCanvasBoundsSync()
      }
    }

    window.addEventListener("mousemove", onMove)
    document.addEventListener("mouseleave", onLeave)
    document.addEventListener("visibilitychange", onVisibilityChange)

    return () => {
      cancelAnimationFrame(rafId)
      cancelAnimationFrame(boundsRafId)
      loadingObserver?.disconnect()
      mo.disconnect()
      if (ro) ro.disconnect()
      window.removeEventListener("resize", scheduleCanvasBoundsSync)
      if (inset) window.removeEventListener("scroll", scheduleCanvasBoundsSync)
      window.removeEventListener("mousemove", onMove)
      document.removeEventListener("mouseleave", onLeave)
      document.removeEventListener("visibilitychange", onVisibilityChange)
      window.removeEventListener("click", onClick)
    }
  }, [inset, tone])

  return (
    <canvas
      ref={canvasRef}
      className={inset
        ? "fixed z-0 pointer-events-none"
        : tone === "auth"
          ? "fixed inset-0 z-0 pointer-events-none bg-white dark:bg-transparent"
          : "fixed inset-0 z-0 pointer-events-none"
      }
    />
  )
}
