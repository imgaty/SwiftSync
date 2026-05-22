"use client"

import * as React from "react"
import { useTheme } from "@/components/theme-provider"
import {
  AlertTriangle,
  ArrowRight,
  Contrast,
  Download,
  Palette,
  Plus,
  Settings,
  Trash2,
} from "lucide-react"

import { Button } from "@/components/ui/button"

function ShowcaseCard({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-3xl border border-black/10 bg-black/[0.02] p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.04] md:p-6">
      <div className="mb-4">
        <h2 className="text-sm font-semibold">{title}</h2>
        <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">{description}</p>
      </div>
      {children}
    </section>
  )
}

export default function ButtonsShowcasePage() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => { setMounted(true) }, [])

  return (
    <main className="min-h-screen bg-white px-6 py-10 text-black transition-colors dark:bg-neutral-950 dark:text-white md:px-10">
      <div className="mx-auto max-w-3xl space-y-6">

        {/* ── Header ──────────────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold tracking-tight">Buttons</h1>
          {mounted && (
            <Button
              variant="glass"
              size="icon"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              aria-label="Toggle theme"
            >
              <Contrast />
            </Button>
          )}
        </div>

        {/* ── Text only ───────────────────────────────────────────── */}
        <ShowcaseCard
          title="Text only"
          description="Primary actions, secondary actions, and lightweight ghost buttons."
        >
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="solid">Continue</Button>
            <Button variant="glass">Back</Button>
            <Button variant="ghost">Skip</Button>
          </div>
        </ShowcaseCard>

        {/* ── Icon + text ─────────────────────────────────────────── */}
        <ShowcaseCard
          title="Icon + text"
          description="The same three styles with leading icons for common actions."
        >
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="solid">
              <Download /> Export data
            </Button>
            <Button variant="glass">
              <Settings /> Open settings
            </Button>
            <Button variant="ghost">
              <ArrowRight /> View details
            </Button>
          </div>
        </ShowcaseCard>

        {/* ── Icon only ───────────────────────────────────────────── */}
        <ShowcaseCard
          title="Icon only"
          description="Toolbar and topbar buttons using the unified icon sizing."
        >
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="solid" size="icon" aria-label="Add">
              <Plus />
            </Button>
            <Button variant="glass" size="icon" aria-label="Theme">
              <Palette />
            </Button>
            <Button variant="ghost" size="icon" aria-label="Settings">
              <Settings />
            </Button>
          </div>
        </ShowcaseCard>

        {/* ── Destructive ─────────────────────────────────────────── */}
        <ShowcaseCard
          title="Destructive"
          description="Danger actions across all three styles and formats."
        >
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="solid-destructive">Delete</Button>
              <Button variant="glass-destructive">Remove access</Button>
              <Button variant="ghost-destructive">Clear all</Button>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="solid-destructive">
                <Trash2 /> Delete file
              </Button>
              <Button variant="glass-destructive">
                <AlertTriangle /> Archive item
              </Button>
              <Button variant="ghost-destructive">
                <Trash2 /> Remove row
              </Button>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="solid-destructive" size="icon" aria-label="Delete">
                <Trash2 />
              </Button>
              <Button variant="glass-destructive" size="icon" aria-label="Alert">
                <AlertTriangle />
              </Button>
              <Button variant="ghost-destructive" size="icon" aria-label="Remove">
                <Trash2 />
              </Button>
            </div>
          </div>
        </ShowcaseCard>

        {/* ── Sizes ───────────────────────────────────────────────── */}
        <ShowcaseCard
          title="Sizes"
          description="sm, default, and lg side-by-side, plus icon-sm / icon / icon-lg."
        >
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="solid" size="sm">Small</Button>
              <Button variant="solid">Default</Button>
              <Button variant="solid" size="lg">Large</Button>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="glass" size="icon-sm" aria-label="Small icon">
                <Plus />
              </Button>
              <Button variant="glass" size="icon" aria-label="Default icon">
                <Plus />
              </Button>
              <Button variant="glass" size="icon-lg" aria-label="Large icon">
                <Plus />
              </Button>
            </div>
          </div>
        </ShowcaseCard>

        {/* ── Disabled ────────────────────────────────────────────── */}
        <ShowcaseCard
          title="Disabled"
          description="Disabled state across variants."
        >
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="solid" disabled>Solid</Button>
            <Button variant="glass" disabled>Glass</Button>
            <Button variant="ghost" disabled>Ghost</Button>
            <Button variant="solid-destructive" disabled>Destructive</Button>
          </div>
        </ShowcaseCard>

      </div>
    </main>
  )
}
