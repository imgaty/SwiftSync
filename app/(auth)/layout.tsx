//
//  layout.tsx
//  Argent
//
//  Created by Hilario Ferreira on 21 March 2026 at 17:05.
//  Description: Defines the home route layout in Argent, providing shared structure, providers, and
//  navigation context for nested screens.
//  Last changed by hilario on 30 May 2026 at 19:35.
//
import { Toaster } from "@/components/ui/sonner"
import { CanvasBackground } from "@/components/canvas-background"

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // AuthShell handles the vertical layout so the footer can sit in normal flow
  // beneath the auth content instead of overlapping it on mobile.
  return (
    <div className="relative min-h-screen w-full bg-white dark:bg-black transition-colors duration-300">
      <CanvasBackground />
      <Toaster richColors closeButton position="bottom-right" />
      {children}
    </div>
  )
}
