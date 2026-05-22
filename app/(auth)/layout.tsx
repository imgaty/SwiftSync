import { Toaster } from "@/components/ui/sonner"
import { CanvasBackground } from "@/components/canvas-background"

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // AuthShell handles the vertical layout (card + footer) so the footer can
  // sit in normal flow beneath the card instead of overlapping it on mobile.
  return (
    <div className="relative min-h-screen w-full bg-white dark:bg-black transition-colors duration-300">
      <CanvasBackground />
      <Toaster richColors closeButton position="bottom-right" />
      {children}
    </div>
  )
}
